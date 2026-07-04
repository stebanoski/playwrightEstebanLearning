// Generado por qa-agent.ts

import { test, expect } from "@playwright/test";
import { LoginPage } from "../../util/UI/pageobjects/LoginPage";

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Login Fallido - Credenciales Inválidas", () => {

    test("Login con usuario inválido y contraseña inválida", async ({ page }) => {

        const login = new LoginPage(page)

        await login.navigate()

        console.log("Intentando login con usuario y contraseña inválidos...")
        await login.loginWithCredentials("invalid_user", "invalid_password")

        console.log("Verificando que el mensaje de error es visible...")
        await login.checkVisibleErrorMessage()

        const errorText = await login.getErrorMessageText()
        console.log("Mensaje de error recibido: ", errorText)

        expect(errorText).toContain("Epic sadface: Username and password do not match any user in this service")
    })

    test("Login con usuario válido y contraseña inválida", async ({ page }) => {

        const login = new LoginPage(page)

        await login.navigate()

        console.log("Intentando login con usuario válido y contraseña incorrecta...")
        await login.loginWithCredentials("standard_user", "wrong_password")

        console.log("Verificando que el mensaje de error es visible...")
        await login.checkVisibleErrorMessage()

        const errorText = await login.getErrorMessageText()
        console.log("Mensaje de error recibido: ", errorText)

        expect(errorText).toContain("Epic sadface: Username and password do not match any user in this service")
    })

    test("Login con usuario inválido y contraseña válida", async ({ page }) => {

        const login = new LoginPage(page)

        await login.navigate()

        console.log("Intentando login con usuario inexistente y contraseña correcta...")
        await login.loginWithCredentials("nonexistent_user", "secret_sauce")

        console.log("Verificando que el mensaje de error es visible...")
        await login.checkVisibleErrorMessage()

        const errorText = await login.getErrorMessageText()
        console.log("Mensaje de error recibido: ", errorText)

        expect(errorText).toContain("Epic sadface: Username and password do not match any user in this service")
    })

    test("Login con campos vacíos", async ({ page }) => {

        const login = new LoginPage(page)

        await login.navigate()

        console.log("Intentando login sin ingresar ninguna credencial...")
        await login.loginWithCredentials("", "")

        console.log("Verificando que el mensaje de error es visible...")
        await login.checkVisibleErrorMessage()

        const errorText = await login.getErrorMessageText()
        console.log("Mensaje de error recibido: ", errorText)

        expect(errorText).toContain("Epic sadface: Username is required")
    })

    test("Login con usuario bloqueado", async ({ page }) => {

        const login = new LoginPage(page)

        await login.navigate()

        console.log("Intentando login con usuario bloqueado...")
        await login.loginWithCredentials("locked_out_user", "secret_sauce")

        console.log("Verificando que el mensaje de error es visible...")
        await login.checkVisibleErrorMessage()

        const errorText = await login.getErrorMessageText()
        console.log("Mensaje de error recibido: ", errorText)

        expect(errorText).toContain("Epic sadface: Sorry, this user has been locked out")
    })

})

/*---

### 📋 Resumen de lo generado

Se crearon **5 casos de prueba** dentro de un `test.describe` que cubren los escenarios de login fallido:

| # | Escenario | Error Esperado |
|---|-----------|---------------|
| 1 | Usuario inválido + contraseña inválida | Credentials do not match |
| 2 | Usuario válido + contraseña incorrecta | Credentials do not match |
| 3 | Usuario inexistente + contraseña válida | Credentials do not match |
| 4 | Campos vacíos | Username is required |
| 5 | Usuario bloqueado (`locked_out_user`) | User has been locked out |

### 💾 Para guardar el archivo
Escribe: **`guardar login-fallido`** y lo nombro `login-fallido.spec.ts`*/