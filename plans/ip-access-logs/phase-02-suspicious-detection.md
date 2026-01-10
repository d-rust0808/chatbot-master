# Phase 02: Suspicious IP Detection

**Status**: ⏳ Pending  
**Priority**: High  
**Date**: 2024-01-09

## Context

Sau khi có access logs, cần detect suspicious IPs dựa trên patterns:
- High request rate
- High error rate
- Unusual user agents
- Accessing sensitive endpoints
- Multiple failed auth attempts

## Overview

- Tạo service để analyze access logs
- Detect suspicious patterns
- Score IPs based on risk factors
- Return recommendations for banning

## Key Insights

- Multiple factors để detect spam (không chỉ rate)
- Real-time detection vs batch analysis
- Configurable thresholds
- Integration với existing suspicious IPs endpoint

## Requirements

1. **Detection Factors**:
   - Request rate (requests/minute)
   - Error rate (% of 4xx/5xx)
   - Failed auth attempts
   - Unusual patterns (bot user agents, etc.)
   - Accessing sensitive endpoints

2. **Scoring System**:
   - Risk score 0-100
   - Multiple factors contribute
   - Configurable weights

3. **API Endpoints**:
   - Get suspicious IPs với scores
   - Get IP details (recent requests)
   - Auto-ban recommendations

## Architecture

```
AccessLogs → Analysis Service → Suspicious IPs → Recommendations
```

## Related Code Files

- `src/services/access-log/suspicious-detection.service.ts` - New
- `src/controllers/admin/ip-management.controller.ts` - Update
- `src/routes/admin.routes.ts` - Add endpoints

## Implementation Steps

1. ⏳ Create suspicious detection service
2. ⏳ Implement scoring algorithm
3. ⏳ Add endpoints for suspicious IPs
4. ⏳ Integrate với IP management

## Todo List

- [ ] Create suspicious detection service
- [ ] Implement scoring algorithm
- [ ] Add getSuspiciousIPs endpoint
- [ ] Add getIPDetails endpoint
- [ ] Add recommendations endpoint
- [ ] Test detection accuracy

## Success Criteria

✅ Suspicious IPs detected accurately  
✅ Scores reflect actual risk  
✅ Recommendations provided  
✅ Performance acceptable

## Risk Assessment

- **False positives**: Normal users flagged → Tune thresholds
- **Performance**: Analysis có thể chậm → Cache results, batch processing

## Security Considerations

- Don't expose sensitive detection logic
- Rate limit detection endpoints
- Audit detection actions

## Next Steps

→ Phase 03: Admin APIs & Integration

