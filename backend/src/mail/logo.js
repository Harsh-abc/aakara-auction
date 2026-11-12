import { readFileSync } from "fs";

// the white Akara logo, embedded in every email (cid:) like the registration banner —
// sendMail.js attaches it whenever the html references it
export const LOGO_FILENAME = "aakara_white.png";
export const LOGO_INLINE_IMAGE = {
    filename: LOGO_FILENAME,
    data: readFileSync(new URL(`./assets/${LOGO_FILENAME}`, import.meta.url)),
};

// the logo is white, so it sits on the same dark brown as the banner
export const LOGO_BACKGROUND = "#2a1d17";

// a full-width dark header row holding the logo (a <tr> for the 480/600px card tables)
export const logoHeaderRow = (href = "https://akaraart.com") => `
                        <!-- Logo -->
                        <tr>
                            <td align="center" style="padding: 28px 40px; background-color:${LOGO_BACKGROUND};">
                                <a href="${String(href).replace(/"/g, "&quot;")}" style="text-decoration:none;">
                                    <img src="cid:${LOGO_FILENAME}" width="110" height="40" alt="Akara" style="display:block; width:110px; height:40px; border:0; color:#ffffff; font-size:16px;" />
                                </a>
                            </td>
                        </tr>`;
