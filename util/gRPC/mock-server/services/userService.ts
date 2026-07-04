import { getUserById, User } from "../repository/userRepository";
import { createUser } from "../repository/userRepository";
import { findUserByEmail } from "../repository/userRepository";
import { AppError } from "../errors/appError";

export function findUserById(id: number): User | undefined {

    return getUserById(id);

}

export function registerUser(data: any) {

    if (!data.email || !data.name || !data.password) {
        throw new AppError(
            "INVALID_ARGUMENT",
            "Missing required fields"
        );
    }

    return createUser(data);
}

export function loginUser(email: string, password: string) {
console.log("🔥 LOGIN HIT MOCK SERVER");
    if (!email || !password) {
        throw new AppError(
            "INVALID_ARGUMENT",
            "Email and password are required"
        );
    }
    console.log("LOGIN INPUT:", email, password);

    const user = findUserByEmail(email);

    console.log("USER FOUND:", user);

    if (!user) {
        throw new AppError(
            "UNAUTHENTICATED",
            "Invalid credentials"
        );
    }

    if (user.password !== password) {
        throw new AppError(
            "UNAUTHENTICATED",
            "Invalid credentials"
        );
    }

    const token = `mock-token-${user.id}`;

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    };

}