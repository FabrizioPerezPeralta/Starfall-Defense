Add-Type -AssemblyName System.Drawing

function Save-Png($bitmap, $path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

# Este script vive en juego-pro/tools; los sprites van a juego-pro/assets
$assets = Join-Path (Split-Path $PSScriptRoot -Parent) "assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null

$size = 128

# ---------------- PLAYER ----------------
$bmp = New-Object System.Drawing.Bitmap -ArgumentList $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 76, 201, 240))
$g.FillEllipse($glow, 6, 6, 116, 116)

$body = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 76, 201, 240))
$g.FillEllipse($body, 16, 16, 96, 96)

$inner = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 38, 128, 190))
$g.FillEllipse($inner, 34, 34, 60, 60)

$visor = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 240, 250, 255))
$g.FillEllipse($visor, 44, 28, 40, 28)

$ring = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 16, 62, 100)), 5
$g.DrawEllipse($ring, 16, 16, 96, 96)

Save-Png $bmp (Join-Path $assets "player.png")

# ---------------- ENEMY ----------------
$bmp = New-Object System.Drawing.Bitmap -ArgumentList $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 239, 71, 111))
$g.FillEllipse($glow, 4, 4, 120, 120)

$spikePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 190, 38, 76)), 7
for ($i = 0; $i -lt 8; $i++) {
    $a = ($i / 8) * [Math]::PI * 2
    $x1 = 64 + [Math]::Cos($a) * 36
    $y1 = 64 + [Math]::Sin($a) * 36
    $x2 = 64 + [Math]::Cos($a) * 62
    $y2 = 64 + [Math]::Sin($a) * 62
    $g.DrawLine($spikePen, [single]$x1, [single]$y1, [single]$x2, [single]$y2)
}

$body = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 239, 71, 111))
$g.FillEllipse($body, 20, 20, 88, 88)

$core = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 130, 22, 55))
$g.FillEllipse($core, 38, 38, 52, 52)

$eye = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 246, 222))
$g.FillEllipse($eye, 44, 44, 17, 17)
$g.FillEllipse($eye, 67, 44, 17, 17)

$pupil = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 28, 8, 18))
$g.FillEllipse($pupil, 49, 48, 8, 11)
$g.FillEllipse($pupil, 72, 48, 8, 11)

Save-Png $bmp (Join-Path $assets "enemy.png")

Get-ChildItem $assets | Select-Object Name, Length
