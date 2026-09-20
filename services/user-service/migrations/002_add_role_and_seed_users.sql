BEGIN;

-- A role label is the only administrator-related data needed for the sample
-- account. It does not add administrator routes or permissions.
ALTER TABLE users
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'STUDENT'
        CHECK (role IN ('STUDENT', 'ADMIN'));

-- Development-only accounts. Each account uses the password Password123!.
-- The values are scrypt hashes, never plaintext passwords.
INSERT INTO users (username, email, password_hash, role)
VALUES
    (
        'alice',
        'alice@u.nus.edu',
        '$scrypt$16384$8$1$8QNcsb4RKEVp+tW5w6K2Rg==$GIeCtcIcd2OQFK0YHooZQnpC6gqvjtKLdAzqc8kYoBNM/CIIURu2s9gVZA467E3E0bvks3yfFosGajG1FxBI3w==',
        'STUDENT'
    ),
    (
        'bob',
        'bob@u.nus.edu',
        '$scrypt$16384$8$1$Y5KjZXHITJTyEiR3aDbNhQ==$3Tk74sCAoJ7gJOeY6pD/hWccURbwp4LePsW+YYuDDLLJSyzaRhqOvhn+/UJKYUALEoGObkI13IUGCzMvs3PFjg==',
        'STUDENT'
    ),
    (
        'admin',
        'admin@nus.edu.sg',
        '$scrypt$16384$8$1$mDybFaujuqxNWS5/Nl9Jpw==$g7ohXNppdAejkkvaMX+NcwFSvTZNVKjMof53m5+/AZjwwK8I6EdEMho3++VW3TipO+y0ysVSzB7axYDF7bc6mQ==',
        'ADMIN'
    )
ON CONFLICT DO NOTHING;

COMMIT;
