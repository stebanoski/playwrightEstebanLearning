import { test, expect } from "@playwright/test";
import { GrpcClient } from "../../util/gRPC/grpcClient";

const grpc = new GrpcClient();

test("Obtener usuario grpc", async () => {

    const response = await grpc.getUser(10)

    expect(response.id).toBe(10);

    expect(response.name).toBe("Esteban");

    //expect(response.email).toContain("@");
    //expect(error.message).toContain("User not found");

});

test("usuario no existe", async () => {

    await expect(async () => {

        await new Promise((resolve, reject) => {

            client.GetUser(
                { id: 999 },
                (err: any, res: any) => {

                    if (err) reject(err);
                    else resolve(res);

                }
            );

        });

    }).rejects.toMatchObject({
        code: 5 // NOT_FOUND
    });

});