# Project Setup

Follow these steps to set up the project and perform database migrations using SeaORM.

### 1. Perform Migrations

Run the following command to apply migrations to your PostgreSQL database:

```shell
sea-orm-cli migrate -u postgresql://postgres:<password>@localhost:5432/chiji-db?schema=public
```

### 2. Generate Entity Models

Generate the SeaORM entity models based on the database schema:

```shell
sea-orm-cli generate entity -u postgresql://postgres:<password>@localhost:5432/chiji-db?schema=public -o entity/src
```

### 3. Running the Server

Once you have your models generated and migrations done, you can start your application:

```shell
cargo run
```

### 4. Example .env file:

```shell
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/chiji-db?schema=public```


// Governance.sol -> space events