$keystoreName = "upload-keystore.jks"
$alias = "upload"
$password = "android" # Default for upload key, change for real production
$dname = "CN=WhereIsIt Inventory, OU=Mobile, O=WhereIsIt, L=Unknown, ST=Unknown, C=US"

$keystorePath = Join-Path $PSScriptRoot "..\android\app\$keystoreName"

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists at: $keystorePath"
} else {
    Write-Host "Generating new upload keystore..."
    keytool -genkeypair -v -storetype PKCS12 -keystore $keystorePath -alias $alias -keyalg RSA -keysize 2048 -validity 10000 -storepass $password -keypass $password -dname $dname
    Write-Host "Keystore generated!"
}

# Update gradle.properties
$gradlePropsPath = Join-Path $PSScriptRoot "..\android\gradle.properties"
$propsContent = Get-Content $gradlePropsPath -Raw

$signingConfig = @"

MYAPP_UPLOAD_STORE_FILE=$keystoreName
MYAPP_UPLOAD_KEY_ALIAS=$alias
MYAPP_UPLOAD_STORE_PASSWORD=$password
MYAPP_UPLOAD_KEY_PASSWORD=$password
"@

if ($propsContent -notmatch "MYAPP_UPLOAD_STORE_FILE") {
    Add-Content -Path $gradlePropsPath -Value $signingConfig
    Write-Host "Added signing config to gradle.properties"
} else {
    Write-Host "gradle.properties already contains signing config"
}
