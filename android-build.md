# CryptoBank — Android Build

Package: `com.app.cryptobank`  
Deep link scheme: `cryptobank://wx-callback`

## Development build (APK)

```bash
# Установить EAS CLI
npm install -g eas-cli

# Логин в Expo
eas login

# Development build с dev-client (APK)
eas build --profile development --platform android
```

Профиль `development` в `eas.json`:
- `developmentClient: true`
- `distribution: internal`
- `android.buildType: apk`

Сгенерирует APK, который можно установить на устройство/эмулятор без стора.

## Deep Link

В `app.json` настроен intent-filter:

```json
{
  "scheme": "cryptobank",
  "host": "wx-callback"
}
```

Проверка:
```bash
adb shell am start -a android.intent.action.VIEW -d "cryptobank://wx-callback?challenge=xxx&signature=yyy&publicKey=zzz&address=3P..."
```

Flow:
1. App создаёт `challenge` через `wallet.createChallenge` (tRPC)
2. Открывает `https://wx.network/auth?challenge=...&redirectUrl=cryptobank://wx-callback?...`
3. Keeper Wallet / WX.Network подписывает challenge
4. Возврат в app по `cryptobank://wx-callback?challenge=...&signature=...&publicKey=...&address=...`
5. App вызывает `wallet.verifyChallenge` (server-side проверка Ed25519)

Никаких Demo Login, seed-фраз и приватных ключей в app нет.
```
