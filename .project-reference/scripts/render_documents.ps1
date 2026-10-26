$ErrorActionPreference = 'Stop'
$workspace = 'C:\Users\5A_Traders\OneDrive\Captures\Documents\DiscoverSalah'
$renderFolder = Join-Path $workspace '.project-reference\rendered-documents'
New-Item -ItemType Directory -Force $renderFolder | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.AutomationSecurity = 3
try {
 foreach ($source in Get-ChildItem -LiteralPath (Join-Path $workspace 'Documents') -Filter '*.docx') {
  $document = $word.Documents.Open($source.FullName, $false, $true, $false)
  try {
   $document.Repaginate()
   $output = Join-Path $renderFolder ($source.BaseName + '.pdf')
   $document.ExportAsFixedFormat($output, 17)
   Write-Output ($source.Name + ': rendered ' + $document.ComputeStatistics(2) + ' pages')
  } finally { $document.Close(0) }
 }
} finally { $word.Quit() }
