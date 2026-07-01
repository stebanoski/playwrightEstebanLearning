import { Locator, Page, expect } from "@playwright/test"

export class CheckOutStepOnePage {

    private readonly firstNameTextBox: Locator
    private readonly lastNameTextBox: Locator
    private readonly zipCodeTextBox: Locator
    private readonly continueButton: Locator

    constructor(page: Page) {

        this.firstNameTextBox = page.getByRole('textbox',{name:'First Name'})
        this.lastNameTextBox = page.getByRole('textbox',{name:'Last Name'})
        this.zipCodeTextBox = page.getByRole('textbox',{name:'Zip/Postal Code'})
        this.continueButton = page.getByRole('button',{name: 'Continue'})
    }

    async fillFirstName(firstName: string) {
        await this.firstNameTextBox.fill(firstName)
    }

    async fillLastName(lastName: string) {
        await this.lastNameTextBox.fill(lastName)
    }

    async fillZipCode(zipCode: string) {
        await this.zipCodeTextBox.fill(zipCode)
    }

    async clickOnContinue() {
        await this.continueButton.click()
    }

    async completeCheckOutStepOne(firstName: string, lastName: string, zipCode: string) {
        await this.fillFirstName(firstName)
        await this.fillLastName(lastName)
        await this.fillZipCode(zipCode)
        await this.clickOnContinue()
    }

}