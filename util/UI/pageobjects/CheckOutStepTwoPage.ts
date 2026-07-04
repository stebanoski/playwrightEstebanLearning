import { Locator, Page, expect } from "@playwright/test"

export class CheckOutStepTwoPage {

    private readonly finishButton: Locator

    constructor(page: Page) {

        this.finishButton = page.getByRole('button',{name: 'Finish'})
    }

    async clickOnFinishButton() {
        await this.finishButton.click()
    }
}