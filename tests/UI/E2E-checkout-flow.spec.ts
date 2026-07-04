import { test, expect } from "@playwright/test";
import { LoginPage } from "../../util/UI/pageobjects/LoginPage";
import { InventoryPage } from "../../util/UI/pageobjects/InventoryPage";
import { CartPage } from "../../util/UI/pageobjects/CartPage";
import { CheckOutStepOnePage } from "../../util/UI/pageobjects/CheckOutStepOnePage";
import { CheckOutStepTwoPage } from "../../util/UI/pageobjects/CheckOutStepTwoPage";
import { CheckOutCompletedPage } from "../../util/UI/pageobjects/CheckOutCompletedPage";

test.use({storageState: {cookies:[], origins:[]}})

test("E2E - checkout flow with random item should succeed", async ({ page }) => {
  const login = new LoginPage(page)
  await login.navigate()
  await login.loginWithCredentials('standard_user','secret_sauce');

  const inventory = new InventoryPage(page)
  await inventory.checkInventoryVisible()
  const titles = await inventory.receiveInventoryTitles()

  console.log('the total number of result is: ', titles.length)
  for(let title of titles){
      console.log('the title is: ', title)
      }

  const randomItem = await inventory.selectRandomItem()

  const expectedDescription = await inventory.getRandomItemDescription(randomItem)
  const expectedName = await inventory.getRandomItemName(randomItem)
  const expectedPrice = await inventory.getRandomItemPrice(randomItem)

  console.log(`Price: ${expectedPrice} Name: ${expectedName} Description ${expectedDescription}`)

  await inventory.clickOnAddToCart(randomItem)

  await inventory.clickOnShoppingCartLink()

  const cart = new CartPage(page)
  await cart.checkVisibleCheckOutButton()

  const actualName = await cart.getItemName()
  const actualDescription = await cart.getItemDescription()
  const actualPrice = await cart.getItemPrice()

  expect(actualName).toEqual(expectedName)
  expect(actualDescription).toEqual(expectedDescription)
  expect(actualPrice).toEqual(expectedPrice)

  //await page.pause()

  await cart.clickOnCheckOutButton()

  const checkOutStepOne = new CheckOutStepOnePage(page)

  await checkOutStepOne.completeCheckOutStepOne('Esteban','Sandoval','44444333')

  const checkOutStepTwo = new CheckOutStepTwoPage(page)
  await checkOutStepTwo.clickOnFinishButton()

  const checkOutCompleted = new CheckOutCompletedPage(page)
  await checkOutCompleted.checkVisibleThankOrderMessage()
});
