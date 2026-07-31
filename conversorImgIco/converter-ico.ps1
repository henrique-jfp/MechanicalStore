param(
    [Parameter(Mandatory, Position=0)]
    [string]$InputPath,

    [Parameter(Position=1)]
    [string]$OutputPath,

    [string]$ApplyFolder
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $InputPath)) {
    Write-Error "Arquivo nao encontrado: $InputPath"
    exit 1
}

$img = [System.Drawing.Image]::FromFile((Resolve-Path $InputPath).Path)
$outPath = if ($OutputPath) { $OutputPath } else { [System.IO.Path]::ChangeExtension($InputPath, ".ico") }

if (Test-Path $outPath) {
    $ans = Read-Host "Arquivo '$outPath' ja existe. Sobrescrever? (s/N)"
    if ($ans -ne "s") { Write-Host "Cancelado."; exit }
}

$sizes = @(16, 32, 48, 64, 128, 256)
$stream = [System.IO.File]::Open($outPath, [System.IO.FileMode]::Create)
$writer = [System.IO.BinaryWriter]::new($stream)

$writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([byte]1); $writer.Write([byte]0)
$writer.Write([int16]$sizes.Count)

$entries = @()
$offset = 6 + 16 * $sizes.Count

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $s, $s)
    $g.Dispose()

    $ms = [System.IO.MemoryStream]::new()
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $data = $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()

    $w = if ($s -ge 256) { 0 } else { [byte]$s }
    $h = if ($s -ge 256) { 0 } else { [byte]$s }

    $entryStream = [System.IO.MemoryStream]::new()
    $entryWriter = [System.IO.BinaryWriter]::new($entryStream)
    $entryWriter.Write([byte]$w)
    $entryWriter.Write([byte]$h)
    $entryWriter.Write([byte]0)
    $entryWriter.Write([byte]0)
    $entryWriter.Write([int16]1)
    $entryWriter.Write([int16]32)
    $entryWriter.Write([int32]$data.Length)
    $entryWriter.Write([int32]$offset)
    $entryWriter.Dispose()

    $entries += @{ Data = $data; Entry = $entryStream.ToArray() }
    $entryStream.Dispose()
    $offset += $data.Length
}

foreach ($e in $entries) {
    $writer.Write($e.Entry)
}

foreach ($e in $entries) {
    $writer.Write($e.Data)
}

$writer.Dispose()
$stream.Dispose()
$img.Dispose()

Write-Host "Icone criado: $outPath ($($sizes.Count) tamanhos)"

if ($ApplyFolder) {
    if (-not (Test-Path $ApplyFolder)) {
        Write-Error "Pasta nao encontrada: $ApplyFolder"
        exit 1
    }
    $desktopIni = Join-Path $ApplyFolder "desktop.ini"
@"
[.ShellClassInfo]
IconResource=$outPath,0
"@ | Set-Content $desktopIni -Encoding Unicode -Force

    Set-ItemProperty $desktopIni -Name Attributes -Value 39
    Set-ItemProperty $ApplyFolder -Name Attributes -Value 7

    Write-Host "Icone aplicado a pasta: $ApplyFolder"
    Write-Host "(Pressione F5 no Explorer para ver)"
}
