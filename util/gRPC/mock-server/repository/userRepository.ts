import * as fs from "fs";
import * as path from "path";
import { AppError } from "../errors/appError";

export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

const filePath = path.join(__dirname, "../../database/users.json");

export function getUsers(): User[] {

    return JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );

}

export function getUserById(id: number): User | undefined {

    const users = getUsers();

    return users.find(user => user.id === id);

}

export function saveUsers(users: User[]) {

    fs.writeFileSync(
        filePath,
        JSON.stringify(users, null, 2),
        "utf8"
    );

}

export function createUser(user: User): User {

    const users = getUsers();

    const exists = users.find(u => u.email === user.email);

    if (exists) {
        throw new AppError(
            "USER_ALREADY_EXISTS",
            "User already exists"
        );
    }

    const newId = users.length > 0
        ? Math.max(...users.map(u => u.id)) + 1
        : 1;

    const newUser = {
        ...user,
        id: newId
    };

    users.push(newUser);

    saveUsers(users);

    return newUser;
}

export function findUserByEmail(email: string): User | undefined {
    const users = getUsers();
    return users.find(u => u.email === email);
}