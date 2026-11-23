# Postman screenshots

Add your **real screenshots from Postman or Thunder Client** to this folder after running the API. No test screenshots are pre-filled or fabricated.

Suggested screenshots:

1. `01-get-all-products.png` — GET `/api/products` returning HTTP 200.
2. `02-create-product.png` — POST `/api/products` returning HTTP 201.
3. `03-get-product-by-id.png` — GET `/api/products/301` returning HTTP 200.
4. `04-get-missing-product.png` — GET `/api/products/9999` returning HTTP 404.
5. `05-update-product.png` — PUT `/api/products/301` returning HTTP 200.
6. `06-delete-product.png` — DELETE `/api/products/303` returning HTTP 200.
7. `07-filter-electronics.png` — category filter returning matching records.
8. `08-filter-no-match.png` — category filter returning `[]` with HTTP 200.
9. `09-invalid-request.png` — invalid POST body returning HTTP 400.

Make sure each screenshot visibly shows the request method/URL, response status and response body where practical.
