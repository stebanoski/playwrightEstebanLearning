import { Locator, Page, expect } from "@playwright/test"

export class InventoryPage {

    private readonly inventoryList: Locator
    private readonly inventoryTitles: Locator
    private readonly itemsContainer: Locator
    private readonly shoppingCartLink: Locator

    constructor(page: Page) {

        this.inventoryList = page.locator('//div[contains(@class,\'inventory_list\')]')
        this.inventoryTitles = page.locator('//div[contains(@class,\'inventory_list\')]//div//a//div')
        this.itemsContainer = page.locator('#inventory_container .inventory_item')
        this.shoppingCartLink = page.locator('a.shopping_cart_link')

    }

    async checkInventoryVisible() {
        await expect(this.inventoryList).toBeVisible()
    }

    async receiveInventoryTitles() {
        return await this.inventoryTitles.allInnerTexts()
    }

    async selectRandomItem() : Promise<Locator>{
        const items = await this.itemsContainer.all()

        if (items.length === 0) {
                throw new Error("No se encontraron elementos para seleccionar.");
        }

        const randomIndex = Math.floor(Math.random() * items.length)

        return items[randomIndex]
    }

    async getRandomItemDescription(item: Locator): Promise<string> {
        return await item.locator('.inventory_item_desc').innerText()
    }

    async getRandomItemName(item: Locator): Promise<string> {
        return await item.locator('.inventory_item_name').innerText()
    }

    async getRandomItemPrice(item: Locator): Promise<string> {
        return await item.locator('.inventory_item_price').innerText()
    }

    async clickOnAddToCart(item: Locator) {
        await item.getByRole('button',{name: 'Add to cart'}).click()
    }

    async clickOnShoppingCartLink() {
        await this.shoppingCartLink.click()
    }

}