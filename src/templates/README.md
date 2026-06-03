# Certificate templates

Each certificate design should live in its own folder here.

Current template:

- `jianhua/template.ts` controls Excel columns, field aliases, and certificate HTML.
- `jianhua/styles.css` controls the background image, text positions, photo size, and print/PDF layout.

To add a new certificate design later:

1. Copy `jianhua` to a new folder, for example `new-school`.
2. Put the new background image in `public/design`.
3. Update the copied `styles.css` background URL and all field/photo positions.
4. Update the copied `template.ts` columns and markup.
5. In `src/main.ts`, change the template import to the new template.

Keep the spreadsheet reader separate. It already supports normal Excel rows, image filenames, image URLs, WPS inserted images, and Excel drawing images.

