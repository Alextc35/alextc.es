param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$outputPath = Join-Path $ProjectRoot 'public/images/og-cover.png'
$portraitPath = Join-Path $ProjectRoot 'public/images/alejandro-tellez-corona.jpeg'
$brandPath = Join-Path $ProjectRoot 'public/favicon-avatar-180.png'
$canvas = New-Object System.Drawing.Bitmap 1200, 630
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$portrait = [System.Drawing.Image]::FromFile($portraitPath)
$resources = [System.Collections.Generic.List[System.IDisposable]]::new()

function New-Brush([string]$Hex) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Hex))
    $resources.Add($brush)
    return $brush
}

function New-Font([float]$Size, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular, [string]$Family = 'Segoe UI') {
    $font = New-Object System.Drawing.Font $Family, $Size, $Style, ([System.Drawing.GraphicsUnit]::Pixel)
    $resources.Add($font)
    return $font
}

try {
    $brandLogo = [System.Drawing.Image]::FromFile($brandPath)
    $resources.Add($brandLogo)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#161815'))

    $white = New-Brush '#f1f1e9'
    $accent = New-Brush '#bfd5a4'
    $muted = New-Brush '#a5a99f'
    $rule = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#3a4035')), 1
    $resources.Add($rule)

    $graphics.DrawImage($brandLogo, 52, 28, 64, 64)
    $graphics.DrawString('PORTFOLIO / 2026', (New-Font 15 ([System.Drawing.FontStyle]::Regular) 'Consolas'), $muted, 170, 54)
    $graphics.DrawLine($rule, 56, 106, 1144, 106)

    $graphics.DrawString('Alejandro', (New-Font 70 ([System.Drawing.FontStyle]::Regular)), $white, 49, 153)
    $graphics.DrawString('Téllez Corona', (New-Font 70 ([System.Drawing.FontStyle]::Regular)), $accent, 49, 233)
    $graphics.DrawString('Full Stack Developer &', (New-Font 25), $white, 56, 355)
    $graphics.DrawString('Cloud Architecture', (New-Font 25), $white, 56, 390)
    $graphics.DrawString('MADRID, ES', (New-Font 15 ([System.Drawing.FontStyle]::Regular) 'Consolas'), $muted, 56, 462)

    # Contain the original photo; retain its full composition and aspect ratio.
    $availableSize = 394.0
    $scale = [Math]::Min($availableSize / $portrait.Width, $availableSize / $portrait.Height)
    $photoWidth = [float]($portrait.Width * $scale)
    $photoHeight = [float]($portrait.Height * $scale)
    $photoX = [float](750 + ($availableSize - $photoWidth) / 2)
    $photoY = [float](140 + ($availableSize - $photoHeight) / 2)
    $graphics.DrawImage($portrait, $photoX, $photoY, $photoWidth, $photoHeight)

    $graphics.DrawLine($rule, 56, 556, 1144, 556)
    $graphics.DrawString('alextc.es', (New-Font 18 ([System.Drawing.FontStyle]::Regular) 'Consolas'), $accent, 56, 578)
    $graphics.DrawString('ALEJANDRO TÉLLEZ CORONA', (New-Font 13 ([System.Drawing.FontStyle]::Regular) 'Consolas'), $muted, 940, 582)

    $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $outputPath
}
finally {
    $portrait.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()
    foreach ($resource in $resources) { $resource.Dispose() }
}
