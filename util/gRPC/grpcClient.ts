import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.dev" });

const PROTO_PATH = path.join(__dirname, "./proto/user.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const proto: any = grpc.loadPackageDefinition(packageDefinition);

const GRPC_HOST = process.env.GRPC_HOST || "localhost:50051";

if (!GRPC_HOST) {
    console.warn("⚠️ GRPC_HOST no definido, usando localhost");
}

const client = new proto.user.UserService(
    GRPC_HOST,
    grpc.credentials.createInsecure()
);

export class GrpcClient {

    login(email: string, password: string): Promise<any> {
        return new Promise((resolve, reject) => {

            client.Login(
                { email, password },
                (err: any, res: any) => {
                    if (err) return reject(err);
                    resolve(res);
                }
            );

        });
    }

    getUser(id: number): Promise<any> {
        return new Promise((resolve, reject) => {

            client.GetUser(
                { id },
                (err: any, res: any) => {
                    if (err) return reject(err);
                    resolve(res);
                }
            );

        });
    }

    createUser(data: any): Promise<any> {
        return new Promise((resolve, reject) => {

            client.CreateUser(
                data,
                (err: any, res: any) => {
                    if (err) return reject(err);
                    resolve(res);
                }
            );

        });
    }
}