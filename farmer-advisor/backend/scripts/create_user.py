import argparse
import getpass
import sys

from app.core.security import hash_password
from app.db import users
from app.db.pool import close_pool, open_pool


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a user, for example an extension officer or admin.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name")
    parser.add_argument("--role", choices=["farmer", "extension_officer", "admin"], default="extension_officer")
    args = parser.parse_args()

    password = getpass.getpass("Password (8 to 72 characters): ")
    if not 8 <= len(password.encode("utf-8")) <= 72:
        print("The password must be 8 to 72 characters.")
        return 1

    open_pool()
    try:
        user = users.create_user(args.email, hash_password(password), args.name, args.role)
    except users.EmailAlreadyRegistered:
        print("That email is already registered.")
        return 1
    finally:
        close_pool()
    print(f"Created {user['role']} {user['email']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
