# CryptoBank — защищённый криптокошелёк WAVES/USDT (Waves + WX.Network + Keeper)

**Стек:** Vite + React + wouter + tRPC + superjson + TanStack Query + Drizzle ORM (MySQL/PostgreSQL совместим) + Zod + Tailwind + SecureStore/AsyncStorage (localStorage)

**Цвета:** `#0B1020` фон, `#151C31` поверхности, `#24D7B2` primary, `#4F7CFF` secondary, `#F5F8FF` текст, `#A6B1CC` вторичный, `#4CD98A` успех, `#FF6677` ошибка.

## Запуск
```bash
pnpm install
pnpm run dev        # http://localhost:3000
pnpm run build
pnpm test
```

## Архитектура
- **Auth:** WX.Network Web Auth challenge/signature. `POST wallet.createChallenge` → возвращает `challenge`, `wxAuthUrl`, `deepLink: cryptobank://wx-callback`. Подпись проверяется на сервере `verifySignatureMock` (ed25519 в проде). Deep linking `cryptobank://wx-callback?challenge=&signature=&publicKey=&address=` обрабатывается в `WalletContext` + возврат из Keeper/WalletConnect.
- **Состояния кошелька:** `disconnected` → `connecting` → `connected` / `expired` / `error` → ручной `disconnect`. Все состояния UI-отображены.
- **Балансы:** серверный `fetchWavesBalances` (мок Waves Node `nodes.wavesnodes.com`) с кэшем `portfolioSnapshots`. При `Waves Node недоступен` показывается последнее сохранённое значение с предупреждением и `isStale`.
- **Отправка:** 5 шагов — `form` → `preflight` (server-side `performPreflight`: проверка адреса Base58 35 символов 3P/3N, точности WAVES 8 / USDT 6, суммы, комиссии 0.001 WAVES, минимального остатка) → `signing` (ожидание подписи в Keeper, без доступа к приватным ключам) → `broadcast` (серверный broadcast, idempotencyKey, защита от дабл-клика) → `success`/`error`. Показывается fee, totalDeduct, remainingBalance, warnings, txId с линком `https://wavesexplorer.com/tx/{id}`.
- **Получение:** выбор WAVES/USDT, QR (`api.qrserver.com`), copy, `navigator.share`, сеть Waves, предупреждение проверки адреса.
- **История:** фильтры по активу/статусу/типу/дате/search, CRUD заметок `transactionNotes`, skeleton/empty/error, пагинация.
- **Активы:** CRUD меток/заметок `assetNotes`, обновление через Waves Node, stale handling.
- **Диагностика:** `diagnosticEvents` + `authChallenges`, показывает только безопасные поля, обрезанные signature/publicKey, `hasChallenge`, `redirectUrl`, `expiresAt`, копирование отчёта без секретов.
- **Профиль:** адрес/сеть/lastSync, PIN (локально hash, `cryptobank:pinHash`), ручная блокировка, `SecureStore` (expo-secure-store, localStorage fallback), тема, уведомления, выход. Seed-фразы никогда не хранятся/не отображаются.
- **Demo:** `ensureDemoData(0)` — карточки WAVES 12.5 / USDT 250, 5 транзакций (success/processing/failed/pending), заметка, disconnected баннер DEMO, блокировка реальной отправки в demo.

## Backend
- `drizzle/schema.ts`: `users`, `wallet_profiles`, `auth_challenges`, `asset_notes`, `transactions`, `transaction_notes`, `diagnostic_events`, `portfolio_snapshots`.
- `server/crypto/waves.ts`: валидация адреса/сумм/комиссий, `fetchWavesBalances`, `getExplorerUrl`, `generateChallenge`, `verifySignatureMock`, `validateCallbackUrl`, `performPreflight`. Покрыто 25 unit-тестами (`server/cryptoBank.test.ts`).
- `server/routers.ts`: `auth`, `wallet`, `assets`, `transactions`, `send`, `diagnostics` — все с Zod, TRPCError, idempotency, offline fallback (in-memory Maps если DB недоступна), авторизация через `getEffectiveUserId` (demo 0).

## Frontend
- `CryptoLayout`: фиксированная sidebar на lg, нижняя навигация + drawer на mobile, safe-area, haptic `navigator.vibrate`, pull-to-refresh.
- Страницы: `Dashboard`, `Assets`, `Send`, `Receive`, `History`, `Diagnostics`, `Profile` — все с loading skeletons, empty states, error retry, optimistic updates для заметок.
- `WalletContext` + `AppLockContext` — сессия, challenge, PIN.
- `TrpcProvider` (httpBatchLink + superjson).

## Android
- `app.json`: `expo.name CryptoBank`, `package com.app.cryptobank`, `scheme cryptobank`, intent-filter `cryptobank://wx-callback`.
- `eas.json`: профиль `development` с `buildType apk`.
- `android-build.md`: команды `eas build --profile development --platform android`, тест deep link через `adb shell am start`.

## Безопасность
- Нет Demo Login, нет хранения seed/privKey, нет секретов в логах, нет on-chain без явного подтверждения, подпись во внешнем кошельке, серверная валидация, Zod на клиенте и сервере.

## Проверка
```bash
pnpm test   # 30 тестов OK (адреса, суммы, preflight, challenge/signature, callback URL)
```
