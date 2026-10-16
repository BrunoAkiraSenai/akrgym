param([string]$Lista, [string]$Saida, [int]$Porta = 5187)
# Cada linha da lista: nome;largura;altura;query[;tempo virtual em ms, padrão 12000]
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
New-Item -ItemType Directory -Force $Saida | Out-Null
foreach ($linha in (Get-Content $Lista)) {
  if (-not $linha.Trim() -or $linha.StartsWith('#')) { continue }
  $nome, $w, $h, $q, $tempo = $linha.Split(';', 5)
  if (-not $tempo) { $tempo = 12000 }
  $perfil = Join-Path $env:TEMP "akr-lab-$Porta-$nome"
  $arquivo = Join-Path $Saida "$nome.png"
  $args = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', "--user-data-dir=$perfil", "--window-size=$([Math]::Max([int]$w, 520)),$h", "--virtual-time-budget=$tempo", "--screenshot=$arquivo", "http://127.0.0.1:$Porta/moldura?w=$w&h=$h&$q")
  $p = Start-Process -FilePath $chrome -ArgumentList $args -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(40000)) { $p.Kill(); "$nome : tempo esgotado" } else { "$nome : $(if (Test-Path $arquivo) { [Math]::Round((Get-Item $arquivo).Length/1kb) } else { 'sem arquivo' }) kB" }
}
