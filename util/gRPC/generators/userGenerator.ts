export class TestData {

    static uniqueUser() {
        const timestamp = Date.now();

        return {
            name: `Esteban${timestamp}`,
            email: `esteban${timestamp}@test.com`,
            password: `Pass${timestamp}!`
        };
    }

}