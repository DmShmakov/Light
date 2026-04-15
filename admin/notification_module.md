✦ Настройка Web Push сертификатов в Firebase Console

    Способ 1: Через Firebase Console (проще)

     1. Открой Firebase Console (https://console.firebase.google.com/) → свой проект
     2. Нажми ⚙️ Project settings (шестерёнка рядом с названием проекта)
     3. Вкладка Cloud Messaging
     4. Раздел Web configuration → нажми Generate key pair
     5. Firebase сгенерирует пару ключей автоматически

    Результат:
     - Key pair появится в разделе Web Push certificates
     - Public key — это твой VITE_FIREBASE_VAPID_KEY
     - Private key хранится в Firebase (для Cloud Functions)

    Способ 2: Сгенерировать самостоятельно

    Если нужна своя пара ключей:

     1 npx web-push generate-vapid-keys

    Вывод будет таким:

     1 Public Key:
     2 BNq-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     3 
     4 Private Key:
     5 yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

    Затем:
     1. Public key → вставь в .env:

     1    VITE_FIREBASE_VAPID_KEY=BNq-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

     2. Private key → Firebase Console → Cloud Messaging → Web Push certificates → Add key pair

    Что сделать после

     1. Скопируй Public Key в .env:

     1    VITE_FIREBASE_VAPID_KEY=твой-public-ключ

     2. Опубликуй firestore.rules — новые правила для fcm_tokens:
        - Firebase Console → Firestore Database → Rules
        - Скопируй содержимое fitness-studio-pwa/firestore.rules
        - Нажми Publish

     3. Убедись что в Firebase Console → Authentication → Sign-in method включены:
        - Email/Password ✅
        - Google ✅

    Проверка

    После настройки:
     1. npm run dev
     2. Зайди в приложение → войди как админ
     3. Профиль → Уведомления → Нажми «Включить уведомления»
     4. Браузер запросит разрешение → разреши
     5. В Firestore должна появиться коллекция fcm_tokens с документом