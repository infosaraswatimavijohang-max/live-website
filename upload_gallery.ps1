<#
  upload_gallery.ps1
  Uploads the public-site gallery images (webp files referenced by the
  galleryData array in js/data.js) into the Supabase Storage 'gallery'
  bucket, upserts the gallery table so src points at the public storage
  URLs, and rewrites galleryData in js/data.js to match.

  Prerequisite: run sql/007_gallery_storage.sql in the Supabase SQL Editor
  first (creates the bucket + storage.objects RLS policies).

  Usage:  powershell -ExecutionPolicy Bypass -File upload_gallery.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Config from js/supabase.js -------------------------------------------
$supabaseJs = Get-Content (Join-Path $root 'js\supabase.js') -Raw
if ($supabaseJs -notmatch "SUPABASE_URL = '([^']+)'") { throw 'SUPABASE_URL not found in js/supabase.js' }
$SUPABASE_URL = $Matches[1].TrimEnd('/')
if ($supabaseJs -notmatch "SUPABASE_ANON_KEY = '([^']+)'") { throw 'SUPABASE_ANON_KEY not found in js/supabase.js' }
$SUPABASE_ANON_KEY = $Matches[1]

$dataPath = Join-Path $root 'js\data.js'
$raw = [System.IO.File]::ReadAllText($dataPath)

# --- Locate the galleryData block -----------------------------------------
$blockStart = $raw.IndexOf('var galleryData = [')
if ($blockStart -lt 0) { throw 'galleryData block not found in js/data.js' }
$entriesStart = $blockStart + 'var galleryData = ['.Length
$blockEnd = $raw.IndexOf('];', $entriesStart)
if ($blockEnd -lt 0) { throw 'galleryData closing ] not found' }
$blockText = $raw.Substring($entriesStart, $blockEnd - $entriesStart)

# --- Parse entries ----------------------------------------------------------
$entries = @()
foreach ($line in ($blockText -split "`n")) {
  if ($line -match 'id:"([^"]+)",\s*src:"([^"]+)",\s*category:"([^"]+)",\s*caption:"([^"]+)"') {
    $entries += [pscustomobject]@{
      Id = $Matches[1]; Src = $Matches[2]; Category = $Matches[3]; Caption = $Matches[4]
    }
  }
}
Write-Host "Parsed $($entries.Count) gallery entries"

function Encode-Path([string]$p) {
  return (($p -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
}

$authHeaders = @{ apikey = $SUPABASE_ANON_KEY; Authorization = 'Bearer ' + $SUPABASE_ANON_KEY }
$uploadHeaders = $authHeaders.Clone(); $uploadHeaders['x-upsert'] = 'true'
$restHeaders = $authHeaders.Clone()
$restHeaders['Content-Type'] = 'application/json'
$restHeaders['Prefer'] = 'resolution=merge-duplicates,return=minimal'

# --- Upload each image ------------------------------------------------------
$uploaded = 0; $skipped = 0
foreach ($e in $entries) {
  if ($e.Src -like 'http*') { $skipped++; continue }
  $local = Join-Path $root ($e.Src -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $local)) { Write-Warning "missing: $local"; continue }
  $objectKey = ($e.Src -replace '^assets/images/', '') -replace '\\', '/'
  $uri = "$SUPABASE_URL/storage/v1/object/gallery/" + (Encode-Path $objectKey)
  $bytes = [System.IO.File]::ReadAllBytes($local)
  Invoke-RestMethod -Method Post -Uri $uri -Headers $uploadHeaders -ContentType 'image/webp' -Body $bytes -TimeoutSec 120 | Out-Null
  $e.Src = "$SUPABASE_URL/storage/v1/object/public/gallery/" + (Encode-Path $objectKey)
  $uploaded++
  Write-Host "uploaded: $objectKey"
}
Write-Host "Uploaded $uploaded, skipped $skipped (already storage URLs)"

# --- Upsert gallery table ---------------------------------------------------
$rows = @($entries | ForEach-Object { @{ id = $_.Id; src = $_.Src; category = $_.Category; caption = $_.Caption } })
$body = $rows | ConvertTo-Json -Depth 5
try {
  Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/rest/v1/gallery" -Headers $restHeaders -Body $body -TimeoutSec 120 | Out-Null
  Write-Host "Gallery table upserted ($($rows.Count) rows)"
} catch {
  Write-Warning "Upsert failed ($($_.Exception.Message)); falling back to clear+insert"
  Invoke-RestMethod -Method Delete -Uri "$SUPABASE_URL/rest/v1/gallery?id=not.is.null" -Headers $authHeaders -TimeoutSec 60 | Out-Null
  Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/rest/v1/gallery" -Headers $restHeaders -Body $body -TimeoutSec 120 | Out-Null
  Write-Host "Gallery table cleared + inserted ($($rows.Count) rows)"
}

# --- Rewrite galleryData in js/data.js (preserves BOM, untouched content) ---
$lines = @($entries | ForEach-Object {
  '  { id:"' + $_.Id + '", src:"' + $_.Src + '", category:"' + $_.Category + '", caption:"' + $_.Caption + '" },'
})
$lines[$lines.Count - 1] = $lines[$lines.Count - 1].TrimEnd(',')
$newBlock = "`n" + ($lines -join "`n") + "`n"
$newRaw = $raw.Substring(0, $entriesStart) + $newBlock + $raw.Substring($blockEnd)
[System.IO.File]::WriteAllText($dataPath, $newRaw, (New-Object System.Text.UTF8Encoding($true)))
Write-Host "js/data.js updated: galleryData now points at storage URLs"
