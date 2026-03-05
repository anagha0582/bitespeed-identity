# Bitespeed Identity Reconciliation

This is my submission for the Bitespeed backend task.

## What it does

The problem is: a customer might shop online using different emails or phone numbers each time. This service figures out when two different sets of contact info belong to the same person and links them together.

For example, if someone orders with 'doc@gmail.com' and '9876543210', and later orders with 'brown@gmail.com' and the same number, the service recognizes it's the same person and merges their records.

## Tech stack

- Node.js + TypeScript
- Express.js
- Prisma ORM
- SQLite

## Challenges I faced

Honestly the hardest part was just understanding the task at first. The "primary turning into secondary" case took me a while to wrap my head around, basically when two separate contacts in the database turn out to be the same person, the older one becomes the primary and the newer one gets demoted to secondary.

On the technical side, I ran into a Prisma version issue, the latest version (v7) had a completely different config setup that wasn't beginner friendly, so I downgraded to v5 which was much more straightforward.

TypeScript was also new to me and threw some errors around types that I had to work through, like the 'verbatimModuleSyntax' config issue and handling possibly undefined values.

Input validation was something I added on top of the base requirements, felt like the right thing to do for a real world API.

In overall, I liked building this project. I like to solve these types of problems that people face in the real-world. I really enjoyed doing this task.

## Running locally

Install dependencies:
```
npm install
```
Set up the database:
```
npx prisma migrate dev
```
Start the server:
```
npm run dev
```
Server runs at http://localhost:3000

## API

**POST /identify**

Request body:
```
{
  "email": "example@gmail.com",
  "phoneNumber": "9876543210"
}
```

Response:
```
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["example@gmail.com", "other@gmail.com"],
    "phoneNumbers": ["9876543210"],
    "secondaryContactIds": [2]
  }
}
```

## Validation

The endpoint validates incoming requests, it rejects empty requests, invalid email formats, and phone numbers that aren't exactly 10 digits.


## what i built it with

- Node.js + TypeScript (first time using typescript, had some config issues at the start)
- Express.js for the server
- Prisma ORM to talk to the database
- SQLite as the database

## how to run it

clone the repo first, then:

install everything
```
npm install
```

set up the database
```
npx prisma migrate dev
```

start the server
```
npm run dev
```

server starts at http://localhost:3000

## the endpoint

POST /identify

send this:
```
{
  "email": "someone@gmail.com",
  "phoneNumber": "9876543210"
}
```

get back this:
```
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["someone@gmail.com", "someoneelse@gmail.com"],
    "phoneNumbers": ["9876543210"],
    "secondaryContactIds": [2]
  }
}
```

## validation i added

- if you send neither email nor phone it'll throw an error
- email has to be in a valid format (has to have @ and a domain)
- phone number has to be exactly 10 digits

