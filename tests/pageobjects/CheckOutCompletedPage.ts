import { Locator, Page, expect } from "@playwright/test"

export class CheckOutCompletedPage {

    private readonly thankOrderHeading: Locator

    constructor(page: Page) {

        this.thankOrderHeading = page.getByRole('heading',{name: 'Thank you for your order!'})
    }

    async checkVisibleThankOrderMessage() {
         await expect(this.thankOrderHeading).toBeVisible()
    }
}