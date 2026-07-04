import { test, expect } from "@playwright/test";
import { GrpcClient } from "../../util/gRPC/grpcClient";

const grpc = new GrpcClient();

test("crear usuario", async () => {

    const response = await grpc.createUser({
            name: "Valeria",
            email: "valeria@test.com",
            password: "1244"
        });

    expect(response.name).toBe("Valeria");
    expect(response.email).toBe("valeria@test.com");

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