# Splitwise Mobile (Phase 2)

This package is the mobile companion app focused on fast capture and Android-first automation.

## Current Scope

- Android-first automation adapter scaffold (`src/features/automation`)
- Receipt camera capture (`expo-image-picker`)
- Receipt OCR upload pipeline using backend `POST /api/v1/uploads/receipt`
- Automation inbox normalization for approval flows

## Commands

- `npm run dev -w packages/mobile`
- `npm run android -w packages/mobile`
- `npm run ios -w packages/mobile`
- `npm run typecheck -w packages/mobile`

## Notes

- SMS/notification ingestion is scaffolded and permission-aware.
- Production Android ingestion should wire a native bridge (SMS Retriever / notification listener)
  and emit normalized `AutomationSignal` records.
- iOS intentionally returns safe no-op automation behavior.
