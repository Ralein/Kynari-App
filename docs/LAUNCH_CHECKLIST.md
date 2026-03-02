# 🚀 Kynari — Launch Checklist

## Pre-Launch Technical
- [ ] All environment variables set in Vercel + Railway production
- [ ] Supabase production project created (separate from dev)
- [ ] All migrations run on production DB (001, 002, 003)
- [ ] RLS policies verified on production
- [ ] Expo push notification certificates configured (iOS APNS, Android FCM)
- [ ] EAS production build submitted to TestFlight
- [ ] 20+ beta testers completed TestFlight and provided feedback
- [ ] All P0 and P1 bugs from beta fixed
- [ ] API rate limiting verified in production
- [ ] Security headers verified in production

## App Store Submission
- [ ] App Store Connect listing complete (screenshots, description, keywords)
- [ ] Privacy Nutrition Label filled out correctly (see `docs/store_listing.md`)
- [ ] Privacy Policy URL live and accessible
- [ ] Terms of Service live at kynari.app/terms
- [ ] Age rating set to 4+ (parenting app, no objectionable content)
- [ ] Apple Review submission notes prepared (explain mic usage clearly)
- [ ] Google Play listing complete (screenshots, description, content rating)

## Legal & Compliance
- [ ] COPPA compliance reviewed (documented self-assessment)
- [ ] Privacy Policy reviewed and published
- [ ] Terms of Service published
- [ ] GDPR data processing documented
- [ ] Data deletion flow tested end-to-end
- [ ] Parental consent flow verified
- [ ] Data retention policy (90 days) enforced via automated purge

## Analytics & Monitoring
- [ ] Error tracking configured (Sentry or equivalent)
- [ ] API health monitoring set up
- [ ] Uptime monitoring configured
- [ ] PostHog analytics integrated (privacy-friendly events only)

## Business
- [ ] Landing page (kynari.app) live with download CTA
- [ ] Social accounts created (@kynariapp on X, Instagram)
- [ ] 3 parent testimonials from beta testers
- [ ] Press kit prepared (docs/press_kit/)
- [ ] Product Hunt launch scheduled
- [ ] Support email configured (support@kynari.app)

## Post-Launch (Week 1)
- [ ] Monitor crash-free rate (target > 99.5%)
- [ ] Monitor API error rate (target < 0.1%)
- [ ] Respond to App Store reviews within 24 hours
- [ ] Collect first user feedback via in-app survey
- [ ] Monitor onboarding completion rate
