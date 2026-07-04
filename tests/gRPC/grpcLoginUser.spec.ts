import { test, expect } from "@playwright/test";
import { GrpcClient } from "../../util/gRPC/grpcClient";

const grpc = new GrpcClient();

test("login exitoso", async () => {

    const response = await grpc.login(
            "esteban@test.com",
            "playwright"
        );

    expect(response.token).toContain("mock-token");
    expect(response.user.email).toBe("esteban@test.com");
    expect(response.user.name).toBe("Esteban");

});