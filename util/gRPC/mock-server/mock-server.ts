import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { findUserById, registerUser, loginUser } from "./services/userService";
import { AppError } from "./errors/appError";

const packageDefinition = protoLoader.loadSync("./util/gRPC/proto/user.proto");

const proto = grpc.loadPackageDefinition(packageDefinition) as any;

const server = new grpc.Server();

function GetUser(call: any, callback: any) {

    const user = findUserById(call.request.id);

    if (!user) {

        callback({
            code: grpc.status.NOT_FOUND,
            message: "User not found"
        });

        return;
    }

    callback(null, {
        id: user.id,
        name: user.name,
        email: user.email
    });

}

function CreateUser(call: any, callback: any) {

    try {

        const user = registerUser(call.request);

        callback(null, {
            id: user.id,
            name: user.name,
            email: user.email
        });

    } catch (err: any) {

          if (err instanceof AppError) {

              switch (err.code) {

                  case "USER_ALREADY_EXISTS":
                      callback({
                          code: grpc.status.ALREADY_EXISTS,
                          message: err.message
                      });
                      return;

                  case "INVALID_ARGUMENT":
                      callback({
                          code: grpc.status.INVALID_ARGUMENT,
                          message: err.message
                      });
                      return;
              }
          }

          console.error(err);

          callback({
              code: grpc.status.INTERNAL,
              message: "Internal error"
          });
      }
}

function Login(call: any, callback: any) {

    try {

        const result = loginUser(
            call.request.email,
            call.request.password
        );

        callback(null, result);

    } catch (err: any) {

        if (err instanceof AppError) {

            switch (err.code) {

                case "INVALID_ARGUMENT":
                    callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        message: err.message
                    });
                    return;

                case "UNAUTHENTICATED":
                    callback({
                        code: grpc.status.UNAUTHENTICATED,
                        message: err.message
                    });
                    return;

            }

        }

        console.error(err);

        callback({
            code: grpc.status.INTERNAL,
            message: "Internal error"
        });

    }

}

server.addService(proto.user.UserService.service, {
    GetUser,
    CreateUser,
    Login
});

server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {

        if (err) {
            console.error("Error binding server:", err);
            return;
        }

        console.log(`Mock gRPC iniciado en puerto ${port}`);

        server.start();
    }
);