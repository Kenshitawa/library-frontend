import { expect, test } from '@playwright/test'

test('shows copy prices and removes a mistaken book from the catalog', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  expect(email, 'Set E2E_EMAIL to an active librarian account').toBeTruthy()
  expect(password, 'Set E2E_PASSWORD to the librarian password').toBeTruthy()

  const unique = Date.now().toString()
  const title = `E2E Price Delete ${unique}`

  await page.goto('/login')
  await page.getByRole('textbox', { name: /email address/i }).fill(email!)
  await page.getByRole('textbox', { name: /password/i }).fill(password!)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/catalog')
  await page.getByRole('button', { name: 'Add Title' }).click()
  const titleDialog = page.getByRole('dialog')
  await titleDialog.getByPlaceholder('e.g. Platinum Mathematics Grade 9').fill(title)
  await titleDialog.getByLabel('Author(s)').fill('E2E Author')
  await titleDialog.getByRole('button', { name: 'Save title' }).click()
  await expect(page).toHaveURL(/\/catalog\/[0-9a-f-]+$/i)

  const addCopy = async (barcode: string, price: string) => {
    await page.getByRole('button', { name: 'Add Copy' }).click()
    const copyDialog = page.getByRole('dialog')
    await copyDialog.getByLabel('Barcode Number').fill(barcode)
    await copyDialog.getByLabel('Replacement Price (in Cents)').fill(price)
    await copyDialog.getByRole('button', { name: 'Add Copy' }).click()
  }

  await addCopy(`E2E-${unique}-1`, '13750')
  await expect(page.getByText('Replacement price:').locator('..')).toContainText(/Ksh\s*137\.50/)

  await addCopy(`E2E-${unique}-2`, '25000')
  await expect(page.getByText('Replacement price:').locator('..')).toContainText(/Varies.*137\.50.*250\.00/)

  await page.goto('/catalog')
  const row = page.locator('tbody tr').filter({ hasText: title })
  await expect(row).toHaveCount(1)
  await row.locator('button').last().click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete book' }).click()
  await expect(row).toHaveCount(0)
})
