import { test, expect } from "@playwright/test";
import { GrpcClient } from "../../util/gRPC/grpcClient";
import { TestData } from "../../util/gRPC/generators/userGenerator";

const grpc = new GrpcClient();

test("crear usuario", async () => {

    const user = TestData.uniqueUser();

    const response = await grpc.createUser({
            name: user.name,
            email: user.email,
            password: user.password
        });

    expect(response.name).toBe(user.name);
    expect(response.email).toBe(user.email);

});

test("usuario duplicado", async () => {

    // segunda creación (debe fallar)
    await expect(
        grpc.createUser({
            name: "Carlos",
            email: "carlos@test.com",
            password: "1234"
        })
    ).rejects.toMatchObject({
        code: 6 // ALREADY_EXISTS
    });

});

test("validacion de campos", async () => {

await expect(
        grpc.createUser({
            name: "",
            email: "",
            password: ""
        })
    ).rejects.toMatchObject({
        code: 3 // INVALID_ARGUMENT
    });

});