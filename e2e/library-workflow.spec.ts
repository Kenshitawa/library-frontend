import { expect, test } from '@playwright/test'

test('catalog, learner, circulation receipts, and inventory export', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  expect(email, 'Set E2E_EMAIL to an active librarian account').toBeTruthy()
  expect(password, 'Set E2E_PASSWORD to the librarian password').toBeTruthy()

  const unique = Date.now().toString()
  const title = `E2E Library Book ${unique}`
  const barcode = `E2E-${unique}`
  const borrowerName = `E2E Learner ${unique}`
  const borrowerNumber = `E2E-${unique}`

  await page.goto('/login')
  await page.getByRole('textbox', { name: /email address/i }).fill(email!)
  await page.getByLabel(/password/i).fill(password!)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Welcome to the library.')).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/catalog')
  await expect(page.getByRole('heading', { name: 'Book Catalog' })).toBeVisible()
  await page.getByRole('button', { name: 'Add Title' }).click()

  const titleDialog = page.getByRole('dialog')
  await titleDialog.getByPlaceholder('e.g. Platinum Mathematics Grade 9').fill(title)
  await titleDialog.getByLabel('Author(s)').fill('E2E Author')
  await titleDialog.getByLabel('Barcode').fill(barcode)
  await titleDialog.getByRole('button', { name: 'Save title' }).click()
  await expect(page).toHaveURL(/\/catalog\/[0-9a-f-]+$/i)

  await page.goto('/borrowers')
  await page.getByRole('button', { name: 'Add Learner or Teacher' }).click()
  const borrowerDialog = page.getByRole('dialog')
  await borrowerDialog.getByLabel('Full Name').fill(borrowerName)
  await borrowerDialog.getByLabel('Admission # / Staff ID').fill(borrowerNumber)
  await borrowerDialog.getByLabel('Borrower Type').selectOption({ label: 'Learner' })
  await borrowerDialog.getByLabel('Class').selectOption({ label: 'Grade 6 Blue' })
  await borrowerDialog.getByLabel('Parent / guardian name').fill('E2E Guardian')
  await borrowerDialog.getByLabel('Parent / guardian phone').fill('+254700000000')
  await borrowerDialog.getByRole('button', { name: 'Save Borrower' }).click()
  await expect(borrowerDialog).toBeHidden()

  await page.goto('/issue')
  const issueScan = page.getByPlaceholder(/scan or type barcode \/ admission/i)
  await issueScan.fill(borrowerNumber)
  await issueScan.press('Enter')
  await expect(page.getByText(`Borrower selected: ${borrowerName}`)).toBeVisible()
  await issueScan.fill(barcode)
  await issueScan.press('Enter')
  await expect(page.getByRole('button', { name: 'Issue All Eligible' })).toBeVisible()
  await page.getByRole('button', { name: 'Issue All Eligible' }).click()
  await expect(page.getByText('Issued ✓')).toBeVisible()

  const issueDownload = page.getByRole('button', { name: `Download receipt for ${title}` })
  const [issueReceipt] = await Promise.all([
    page.waitForEvent('download'),
    issueDownload.click(),
  ])
  expect(issueReceipt.suggestedFilename()).toMatch(/library-issue-receipt-.*\.pdf$/)

  await page.goto('/return')
  const returnScan = page.getByPlaceholder(/scan returned book barcode/i)
  await returnScan.fill(barcode)
  await returnScan.press('Enter')
  await page.getByRole('button', { name: 'Confirm Return' }).click()
  await expect(page.getByText(/Successfully checked in/)).toBeVisible()

  const returnDownload = page.getByRole('button', { name: `Download return receipt for ${title}` })
  const [returnReceipt] = await Promise.all([
    page.waitForEvent('download'),
    returnDownload.click(),
  ])
  expect(returnReceipt.suggestedFilename()).toMatch(/library-return-receipt-.*\.pdf$/)

  await page.goto('/reports')
  await page.getByLabel('Report').selectOption({ label: 'Full copy-by-copy inventory' })
  await expect(page.getByText('Inventory copies')).toBeVisible()
  const [inventoryReport] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(inventoryReport.suggestedFilename()).toMatch(/library-inventory-.*\.csv$/)
})
