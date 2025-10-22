# Profile Page Data Map

Этот документ описывает, какие данные используются на странице профиля (`client/src/pages/profile/ProfilePage.tsx`), откуда они приходят и где отображаются.

## Основные структуры

- `data` — объект типа `ProfileResponse`, возвращаемый `fetchProfile(username)`. Содержит сведения о пользователе, его записей, уведомления, подписчиков и подписки.
- `posts` — массив типа `ProfilePost`. Изначально берётся из `data.posts`, далее дополняется через `fetchProfilePosts`.
- `user`, `token` — данные авторизации из контекста `useAuth`. Нужны, чтобы определить свой профиль (`isSelf`) и разрешить действия (создание постов, подписка).

## Поля профиля

| Поле | Источник | Где используется | Назначение |
| --- | --- | --- | --- |
| `data.profile.displayName` | `ProfileResponse.profile.displayName` | Шапка профиля (отображаемое имя), карточка поста (`PostCard`) | Имя пользователя, показанное в UI. |
| `data.profile.username` | `ProfileResponse.profile.username` | Шапка (`@username`), ссылки (чат, API вызовы), мобильный заголовок | Уникальный логин, используется в ссылках и запросах. |
| `data.profile.createdAt` | `ProfileResponse.profile.createdAt` | Текст “На сайте с …” в шапке | Дата регистрации на платформе. |
| `data.profile.stats.followers` | `ProfileResponse.profile.stats.followers` | Корректировка счётчика после follow/unfollow | Количество подписчиков. |
| `data.profile.stats.posts` | `ProfileResponse.profile.stats.posts` | Расчёт `totalPosts`, строка “Показано N из M” | Общее число публикаций. |
| `data.profile.profile.avatarUrl` | `ProfileResponse.profile.profile.avatarUrl` | Аватар в карточке профиля и в `PostCard` | Ссылка на аватар пользователя. |
| `data.profile.profile.coverUrl` | `ProfileResponse.profile.profile.coverUrl` | Фон верхнего блока (CSS `background-image`) | Ссылка на обложку профиля. |
| `data.profile.profile.bio` | `ProfileResponse.profile.profile.bio` | Блок “О себе” (если пусто — `BIO_PLACEHOLDER`) | Описание пользователя. |

## Поля постов

| Поле | Источник | Где используется | Назначение |
| --- | --- | --- | --- |
| `post.id` | `ProfilePost.id` | `key` в компоненте `PostCard` | Уникальный идентификатор записи. |
| `post.createdAt` | `ProfilePost.createdAt` | `PostCard`: `formatRelative(post.createdAt)` | Время публикации (человеко‑читаемо). |
| `post.content` | `ProfilePost.content` | Основной текст `PostCard` | Текст записи. |
| `post.title` | `ProfilePost.title` | Заголовок `PostCard` (если существует) | Дополнительный заголовок поста. |
| `post.imageUrl` | `ProfilePost.imageUrl` | Изображение в `PostCard` | Иллюстрация записи. |
| `post.likesCount` | `ProfilePost.likesCount` | Счётчик в блоке кнопок | Количество лайков/голосов “за”. |
| `post.commentsCount` | `ProfilePost.commentsCount` | Сейчас не выводится (резерв) | Потенциальный счётчик комментариев. |

## Локальные состояния и вычисления

| Поле | Тип / источник | Где используется | Назначение |
| --- | --- | --- | --- |
| `bio` | Локальная переменная (`data.profile.profile.bio` или `BIO_PLACEHOLDER`) | Блок “О себе” | Гарантирует ненулевой текст описания. |
| `isSelf` | `useMemo` (сравнение `user.username` и параметра `username`) | Управляет отображением кнопок редактирования, подписки | Флаг “это мой профиль”. |
| `hasMorePosts` | `useState` | Условие показа кнопки “Загрузить ещё” | Признак наличия дополнительных постов. |
| `postsOffset` | `useState` | Параметр `offset` для `fetchProfilePosts` | Сколько записей уже загружено со стены. |
| `totalPosts` | `useState` (старт — `data.profile.stats.posts`) | Строка “Показано N из M” | Общее количество публикаций, синхронизируется при подгрузках. |
| `composerLoading` | `useState` | Кнопка “Отправить” в форме | Флаг отправки нового поста. |
| `loadMoreError` | `useState` | Сообщение под списком постов | Ошибка при подгрузке следующей страницы. |
| `token` | `useAuth` | Проверки в `createProfilePost`, follow/unfollow | Токен для авторизованных запросов. |

## Где искать детали реализации

- `client/src/pages/profile/ProfilePage.tsx` — основная логика UI и состояния.
- `client/src/api/profile.ts` — типы (`ProfileResponse`, `ProfilePost`) и функции `fetchProfile`, `fetchProfilePosts`, `createProfilePost`.
- `server/src/modules/profile/*` — серверные контроллеры, сервисы и репозитории, формирующие ответ API.
