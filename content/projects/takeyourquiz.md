## What it does

TakeYourQuiz is a website for testing yourself on multiple-choice questions you already have as a PDF.

1. You sign up and log in.
2. You create a quiz: a name plus one PDF of questions, which is uploaded to an Amazon S3 bucket.
3. On the quiz's settings page you pick the answer key from one A to D dropdown per question, and a time limit that applies to each question.
4. The quiz page shows the PDF on the left, through Adobe's PDF Embed API, and four buttons, A to D, on the right. Each question has its own countdown. When you answer, your button turns green or red and the correct one is highlighted. The running marks are shown as you go.
5. "Get Results" saves the attempt. The result page shows the marks and a numbered bar, one colour per question: green for correct, red for wrong, grey for a question you skipped with NEXT.

The site does not read the questions out of the PDF. You read them in the viewer and enter the answer key yourself.

## How it works

- **Server.** An Express app renders Pug templates and serves a JSON API under `/projectRoutes`. Data is kept in MongoDB through Mongoose, in two collections: users, and one document per quiz holding the PDF's URL, the timer, the answer key (a map from question number to letter) and the last result.
- **Uploads.** multer with multer-s3 streams the file straight to S3 and accepts only PDFs. Until May 2022 uploads went to a local folder instead.
- **Login.** Passwords are hashed with bcrypt. Logging in signs a JWT (a signed JSON token) valid for 24 hours and stores it in an httpOnly cookie, which page scripts cannot read. Each logged-in page script asks `/refresh_token` for a 15-minute token to send in the `Authorization` header, and renews it every 899.5 seconds (15 minutes minus half a second).
- **Scoring.** The browser does the scoring: +4 for a correct answer, −1 for a wrong one, 0 for a skip or a timeout. For example, 10 questions with 7 right, 2 wrong and 1 skipped score 7 × 4 − 2 × 1 = 26.

## Status

The git history covers April and May 2022 and starts with the code mostly written; two small view fixes followed in December 2022. The Render deployment returned its login page on 11 November 2026. Whether its database and storage still work behind it is unchecked.

These limits come from reading the code.

- Quizzes are looked up by name only, not by name and owner. A logged-in user who knows another quiz's name can read its answer key and change its settings or result. Two quizzes with the same name collide.
- The answer key reaches the browser before the quiz starts, and the score is computed there. That suits testing yourself, not testing other people.
- Files are stored in S3 under their original names and are publicly readable, so two uploads with the same name overwrite each other.
- A wrong password gets no response, so the login request hangs.
- The answer key can only be appended to, and a quiz cannot be deleted.
- The layout is built for large screens, and there are no tests.
