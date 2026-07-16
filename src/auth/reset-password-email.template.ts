export interface ResetPasswordEmailData {
  prenom: string;
  lienReinitialisation: string;
}

export function genererEmailReinitialisation(data: ResetPasswordEmailData): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#b3131c;padding:24px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">SanguinTG</span>
                <span style="color:#ffe0e0;font-size:13px;display:block;margin-top:2px;">CNTS Lomé · Mobilisation des donneurs</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:13px;color:#b3131c;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Réinitialisation du mot de passe</p>
                <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">Bonjour ${data.prenom}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Vous avez demandé la réinitialisation du mot de passe de votre compte Sanguine TG. Cliquez sur le
                  bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 1 heure.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                  <tr>
                    <td>
                      <a href="${data.lienReinitialisation}" style="display:inline-block;background-color:#b3131c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">Choisir un nouveau mot de passe</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 4px;font-size:13px;color:#7a7a7a;">
                  Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe
                  actuel reste valide.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #eeeeee;">
                <p style="margin:0;font-size:12px;color:#9a9a9a;line-height:1.5;">
                  Centre National de Transfusion Sanguine · Lomé, Togo
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
