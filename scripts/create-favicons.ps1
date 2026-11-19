param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $ProjectRoot 'assets/brand/favicon-avatar.png'
$source = [System.Drawing.Bitmap]::new($sourcePath)

try {
    $left = $source.Width
    $top = $source.Height
    $right = -1
    $bottom = -1
    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            if ($source.GetPixel($x, $y).A -ge 16) {
                $left = [Math]::Min($left, $x)
                $top = [Math]::Min($top, $y)
                $right = [Math]::Max($right, $x)
                $bottom = [Math]::Max($bottom, $y)
            }
        }
    }
    if ($right -lt $left -or $bottom -lt $top) { throw 'The favicon source is fully transparent.' }

    # Retain edge antialiasing while removing unused transparent canvas.
    $left = [Math]::Max(0, $left - 1)
    $top = [Math]::Max(0, $top - 1)
    $right = [Math]::Min($source.Width - 1, $right + 1)
    $bottom = [Math]::Min($source.Height - 1, $bottom + 1)
    $sourceWidth = $right - $left + 1
    $sourceHeight = $bottom - $top + 1
    $sourceRectangle = [System.Drawing.RectangleF]::new($left, $top, $sourceWidth, $sourceHeight)

    foreach ($size in @(16, 32, 48)) {
        $canvas = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppPArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            $scale = ($size - 0.5) / [Math]::Max($sourceWidth, $sourceHeight)
            $width = $sourceWidth * $scale
            $height = $sourceHeight * $scale
            $destination = [System.Drawing.RectangleF]::new(($size - $width) / 2, ($size - $height) / 2, $width, $height)
            $graphics.DrawImage($source, $destination, $sourceRectangle, [System.Drawing.GraphicsUnit]::Pixel)

            $outputPath = Join-Path $ProjectRoot "public/favicon-avatar-tab-$size.png"
            $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Output $outputPath
        }
        finally {
            $graphics.Dispose()
            $canvas.Dispose()
        }
    }
}
finally {
    $source.Dispose()
}
