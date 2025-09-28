# Memory Finder: Day-by-Day Development Flow Example

## 🌅 **Monday Morning - Start New Feature**

### **🎯 Scenario: Adding "Video Compilation Progress Bar"**

```bash
# 1. Switch to development
cd /Users/richardmugwaneza/memory-finder
git checkout dev
npm run dev:dev                    # 🔧 This creates LOCAL DEV ENVIRONMENT
# ↳ Opens http://localhost:3000 - Memory Finder, checked off DEV AWS
```

**What happens:**
- **Environment**: Connection to DEV AWS resources ✅ 
- **Data**: Testing with mock videos ✅
- **Risk**: Even if code completely breaks, customers unaffected ✅
- **Status**: Development like a playground 🪜

---

### **🔧 9:00 AM - Write Code**
```typescript
// File: components/upload/ProgressBar.tsx (NEW)
export const ProgressBar = ({ percentage } : { percentage: number }) => {
  return (
    <div className="progress-bar">
      <div className="bar" style={{width: `${percentage}%`}}></div>
      <div className="text">{percentage}% uploaded!</div>
    </div>
  );
}
```

```typescript
// File: pages/api/upload/route.ts (MODIFIED)
import { ProgressBar } from "../../../components/upload/ProgressBar";

export default async function POST(req: Request) {
  // OLD: const chunk = await formData.get('file');
  // NEW: Call to onUpload Progress:
  return NextResponse.json({ 
    upload_progress_url: `/upload/progress/${fileId}`,
    status: 'uploading'
  });
}
```

---

### **🧪 10:00 AM - Test It**
```bash
# Your Memory Finder at http://localhost:3000:
Open browser → Upload a test video → Watch:

X II III III █▓██▓▓██▓▓    Upload 68% ✓
        └─────── YAY!! It works!!!!
```

**Success!** → Upload progress bar appears while video processing occurs.
 Your DEV environment now works perfectly locally.

---

### **🎯 11:00 AM - Deploy to Testing** 
```bash
# Stage your changes
git add .                        # Prepare all changes
git commit -m "Add video upload progress bar"  

git push origin dev              # 🚀 Auto-deploys to DEV AWS cloud
```

**⟡ What happens automatically:**
1. GitHub Actions *receives a PUSH to dev    branch*
2. Automated pipeline runs:
   - ✅ **Lint:** Code looks good
   - ✅ **Type-check:** Makes sense
   - ✅ **Tests:** Previous bug fixes still work
   - ✅ **Deploy:** Pipelines deploy Memory Finder DEV now live
3. **Test URL becomes**: `https://memory-finder-dev-*.amplifyapp.com`
     —that is the DEV cloud URL; customers can’t reach it.

---

### **🔧 11:15 AM - Check Cloud DEV Environment**
```bash
# Visit the cloud URL to confirm DEV
https://memory-finder-dev-*.amplifyapp.com → Upload a file  
Watch your new progress bar running on AWS cloud!
```

**Note:** No user is seeing this yet. This is *your private test site*.

---

### **🔧 Afternoon - Polish DEV Further**
```bash
# Add more tests  
Edit tests/upload.test.js
npm run dev:dev                    # Continue development stack
```

---

### **📦 3:00 PM - Deploy to STAGING**
```bash
# Move to staging
git checkout staging              # Switch to staging branch
git merge dev                    # Pull my changes into staging
git push origin staging          # Deploy to STAGING cloud (instant)
```

**⟡ What happens automatically:**
1. **Pipeline:** Wait 2 min for CloudFormation to deploy STAGING environment.
2. **STAGING deploys:**Real AWS resources – S3 bucket, Lambda, DynamoDB: `memory-finder-staging`
3. **Smoke tests run on STAGING:**
    — Upload a file
    — Find analytics
    — Invite couples;
    — If tests pass, prompt goes `Ready for manual review?`
4. STAGING environment is ready and **looks precisely like
   live production**.

---

### **⏰ Monday evening - Production moment.**

```bash
# Two days later, when you feel confident about STAGING  

git checkout main                 # Switch to production branch
git merge staging               # Pull latest approved changes
git push main                   # Post to trigger PRODUCTION pipeline!
```

**⟡ What happens:**
1. **CloudFormation checks** — is everything from STAGING ok?
2. **Manual approval step**: Click “**Confirm Production Deploy**” button inside GitHub.
3. 🚀 **Production deployments** ​​→Your live website (customers)=`memory-finder.com`
4. 🌍 **Customers start seeing** your new upload progress bar feature ✨​

---

## 📊 **Every Environment List**

| ENVIRONMENT |     WHO MAINLY USES    | WHAT ENV IS USED                                  |
|-------------|------------------------|---------------------------------------------------|
| **DEV**      | You (Developer)        | CI → https://memory-finder-*dev.amplifyapp.com        |
| **STAGING**| QA / Testing team     | push dev  → https://memory-finder-staging.amplifyapp.com ​​  |
| **PROD**    | Live customer website | push main → https://memory-finder.amplifyapp.com     ​​|

---

## 🎪 **What You Will Learn About ‘the Route’:**

|TIME|    	      JOB    	        |        MANUSCRIPT                                                  |
|----|---------------------------|-------------------------------------------------------------------------|
| Day 1  |	Feature on dev   	      | “Perhaps we’ll try a new upload better”                                |
| |  git push dev              | CloudFormation refreshes *DEV* infra into AWS Amplify dev builds. 	        |
| Day 2  |	Deploy → STAGING 	    | “Seems ready to let QA look.” 	    git push staging                   | Code validates and deploys STAGING AWS stack. 	         	  (wait 5 min) 	 (STAGING confirms.) 	  git merge dev  	 🤵‍♂️ 	    Quick assignment(**with AWS Amplify  	    	    Deployment: 	  	    Staging builds*) 	 (before the Push of main 	 Production pipeline will first require a manual “app”.). Then anyway 	 … it turns  **automated** (push version up HTTP with a small GitHub integration step). 	 

|  ` Day 3  |	Production readiness 	    | “Let’s ship it!” 	    	  git push main 	                                | 	 Deployment writes the DEV code    	    Already validated STAGING ✓ 	 (ci pipeline runs 	 a Built-in final smoke tests and deploys with **CF ** my ** prod stack(prod)**.                                                                    	 …… – ‼️ just four clicks and kaboom… your code’s live. 	 —> 	 https://memory-finder.amplifyapp.com

---
## 🌍 **Memory Finder life diagram**

```
Style: How to add a new upload feature:    

LOCAL DEV
{npm run dev:dev}
====

Morning  →  uploadbar/DEV DEVELOPMENT
[DEV]   → [TEST]:
Local File Upload/DEV T_1
         →   git push dev
        (1 to 3 minutes) → {CI lovingly deploys: DEV @AWS}
====

Noon  →  STAGING (DEV→STAGING)
[STAG] → [Test]:
Strain file    ⇒LAUNCH on STAG Server:
Staging Tests  → OK           → STAGING         ✓ OK      Ready

Two days later …  →PRODUCTION{Live customers}:
[PROD] →[ Manual Approval]  ⇒ CF deploys IoT→Lambda:Amazon→S3     ( Live )  🎆 	 memory-finder     = memory-finder PROD                             (         ↘️ 	    —   –—–   –– recently uploaded       V    examples )     	      ——————— —————

Memory finder is live for couples worldwide to upload their wedding wedding footage (with the new progress bar appearing!)! 🌍​.

```


``` Today :
 ‹First endorse».        tomorrow » 	 «Next couple». 		 Full deployment anytime!
 (throttle-safe DEV.)	=> 		     (STAGING det ☺️.) * bundle 	 live. 	 „

Just remember:         

* Block it forever on DEV. !!* Forever EVOLVE (Green prox tube       !).

   — Under delay                               	    — It worked  	    — Live

( Whatever your edit now is prepared for the “brick path” *route *to* |memory-finder| *app/(.site), you can clone on a number of stupid factors.)
```

---  


 — ShoW_O-
 Confidence

 (Save a device.)

— —————————————————————————————————————————————————————

BEST ENERGY POLICY for a beginner  ^^^ STAY LOCKED ON DEV!!!

 ^—Ask colleagues/QA to peek on STAGING when confident.....

 ^ ^ ^ Then go ​​ `push main` at a mental milestone.

   (Every feature travelled that ‘route,’ end-to-end.)

   … k.

—
— Humans tend to learn … …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …… …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. …. .....

