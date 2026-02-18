
# Plan de Ejecución — Password Reset Email (Backend)

## Objetivo
Completar el flujo de password reset enviando el email real con template React Email, y validando la integración E2E.

---

## Tareas Técnicas

1. **Crear/actualizar el template de email para password reset**
	- Usar React Email, siguiendo la estructura de templates existentes.

2. **Actualizar el event handler de PasswordResetRequestedEvent**
	- Inyectar el servicio de email y enviar el email real usando Resend.
	- Eliminar cualquier console.log residual.

3. **Validar el flujo E2E**
	- Solicitar reset → recibir email real → usar token → nueva contraseña → login.
	- Validar edge cases: token inválido, expirado, password inválido.

4. **Actualizar/crear pruebas e2e**
	- Cubrir el flujo completo de password reset en test/e2e.

5. **Actualizar documentación técnica**
	- Swagger/OpenAPI y docs internos.

---

## Checklist de Validación
- [ ] Email de password reset se envía vía Resend (NO console.log)
- [ ] Template de email cumple con estructura y branding
- [ ] Event handler envía email real
- [ ] Flujo E2E validado con frontend
- [ ] Pruebas e2e actualizadas
- [ ] Documentación técnica actualizada

---

## Referencias
- test/e2e/rate-limit.e2e-spec.ts (estructura de pruebas e2e)
- src/bounded-contexts/auth/application/commands/forgot-password/
- src/bounded-contexts/auth/application/commands/reset-password/
- src/bounded-contexts/auth/infrastructure/controllers/forgot-password/
- src/bounded-contexts/auth/infrastructure/controllers/reset-password/
- src/bounded-contexts/auth/application/event-handlers/password-reset-requested.event-handler.ts

---

> Documento actualizado por Backend Systems Architect — Feb 2026
