param([string]$Lista, [string]$Saida)
# Cada linha da lista: nome;largura;altura;query
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
New-Item -ItemType Directory -Force $Saida | Out-Null
foreach ($linha in (Get-Content $Lista)) {
  if (-not $linha.Trim() -or $linha.StartsWith('#')) { continue }
  $nome, $w, $h, $q = $linha.Split(';', 4)
  $perfil = Join-Path $env:TEMP "akr-lab-$nome"
  $arquivo = Join-Path $Saida "$nome.png"
  $args = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', "--user-data-dir=$perfil", "--window-size=$([Math]::Max([int]$w, 520)),$h", '--virtual-time-budget=12000', "--screenshot=$arquivo", "http://127.0.0.1:5187/moldura?w=$w&h=$h&$q")
  $p = Start-Process -FilePath $chrome -ArgumentList $args -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(40000)) { $p.Kill(); "$nome : tempo esgotado" } else { "$nome : $(if (Test-Path $arquivo) { [Math]::Round((Get-Item $arquivo).Length/1kb) } else { 'sem arquivo' }) kB" }
}
