import { Locator, Page, expect } from "@playwright/test"

export class CartPage {

    private readonly checkoutButton: Locator
    private readonly itemName: Locator
    private readonly itemDescription: Locator
    private readonly itemPrice: Locator

    constructor(page: Page) {

        this.checkoutButton = page.getByRole('button',{name: 'Checkout'})
        this.itemName = page.locator('.inventory_item_name')
        this.itemDescription = page.locator('.inventory_item_desc')
        this.itemPrice = page.locator('.inventory_item_price')
    }

    async checkVisibleCheckOutButton() {
        await expect(this.checkoutButton).toBeVisible()
    }

    async getItemName(){
        return await this.itemName.innerText()
    }

    async getItemDescription(){
        return await this.itemDescription.innerText()
    }

    async getItemPrice(){
        return await this.itemPrice.innerText()
    }

    async clickOnCheckOutButton() {
        await this.checkoutButton.click()
    }
}