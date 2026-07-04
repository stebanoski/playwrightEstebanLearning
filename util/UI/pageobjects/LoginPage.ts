import { Locator, Page, expect } from "@playwright/test"

export class LoginPage {

    private readonly page: Page
    private readonly usernameTextbox: Locator
    private readonly passwordTextbox: Locator
    private readonly loginButton: Locator
    private readonly errorMessage: Locator

    constructor(page: Page) {
        this.page = page
        this.usernameTextbox = page.getByRole('textbox', { name: 'Username' })
        this.passwordTextbox = page.getByRole('textbox', { name: 'Password' })
        this.loginButton = page.getByRole('button', { name: 'Login' })
        this.errorMessage = page.locator('[data-test="error"]')
    }

    // ── Navegación ──────────────────────────────────────────────
    async navigate() {
        await this.page.goto(process.env.URL)
    }

    // ── Acciones ─────────────────────────────────────────────────
    async fillUsername(username: string) {
        await this.usernameTextbox.fill(username)
    }

    async fillPassword(password: string) {
        await this.passwordTextbox.fill(password)
    }

    async clickOnLogin() {
        await this.loginButton.click()
    }

    async loginWithCredentials(username: string, password: string) {
        await this.fillUsername(username)
        await this.fillPassword(password)
        await this.clickOnLogin()
    }

    async clearFields() {
        await this.usernameTextbox.clear()
        await this.passwordTextbox.clear()
    }

    // ── Aserciones ───────────────────────────────────────────────
    async checkVisibleErrorMessage() {
        await expect(this.errorMessage).toBeVisible()
    }

    async getErrorMessageText(): Promise<string> {
        return await this.errorMessage.innerText()
    }

    async checkErrorMessageText(expectedText: string) {
        await expect(this.errorMessage).toContainText(expectedText)
    }

    async checkLoginButtonVisible() {
        await expect(this.loginButton).toBeVisible()
    }

}