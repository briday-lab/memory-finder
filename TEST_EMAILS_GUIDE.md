# Memory Finder Testing - Email Accounts Guide

## 🎯 **RECOMMENDED TEST EMAILS**

### **Videographer Test Account:**
```
Email: tester.videographer@memoryfinder.test  
Password: MemoryFinder2024!
Display Name: John Wedding Videographer
Role: Videographer
```

### **Couple Test Accounts:**
```
Primary Couple:
Email: julia.tom@memoryfinder.test
Password: MemoryFinder2024!
Display Names: 
  - Julia Smith (Bride)
  - Tom Johnson (Groom)
Role: Couple

Secondary Couple (for multiple weddings):
Email: sarah.mike@memoryfinder.test  
Password: MemoryFinder2024!
Display Names: Sarah & Mike Davis
Role: Couple
```

---

## 🎬 **Testing Scenarios Using These Accounts:**

### **Current Testing Flow:**

**1. VIDEOTHER TESTING** (Use `tester.videographer@memoryfinder.test`)
- Create wedding event
- Upload real video footage
- Test AI processing pipeline
- Share project with couples
- Monitor compilation generation

---

### 🔍 **Complete Testing Workflow:**

**PART 1: Videographer Actions**
1. Login: `tester.videographer@memoryfinder.test`
2. Navigate to videographer dashboard
3. Create new wedding project
4. Upload multiple sample videos
5. Trigger AI processing
6. Verify compilation creation
7. Share project with couple(s)

---

### 💑 **PART 2: Couple Actions**
1. Navigate to shared project link
2. Login as couple: `julia.tom@memoryfinder.test`
3. Use intelligent search:
   - "wedding vows"
   - "first dance"
   - "ceremony"
   - "cake cutting"
4. Test smart compilations
5. Save favorites and share

---

## 📧 **Email Test Script (Copy & Paste Ready):**

```bash
# VIDEOTHER LOGIN
Email: tester.videographer@memoryfinder.test
Password: MemoryFinder2024!

# COUPLE LOGIN
Email: julia.tom@memoryfinder.test  
Password: MemoryFinder2024!

# SHARED PROJECT LINK (after creating via videographer)
https://[your-domain]/invitation/[PROJECT_ID]
```

---

## 🧪 **Expected Testing Results:**

### **Videographer Dashboard Tests:**
1. ✅ Login successful
2. ✅ Project creation works
3. ✅ File upload enables AI processing buttons
4. ✅ Processing queue displays video status
5. ✅ Smart compilation preview shows result
6. ✅ Analytics tracking works
7. ✅ Project sharing sends emails successfully

### **Couple Dashboard Tests:**
1. ✅ Login accepts shared link access
2. ✅ Project appears in couple view
3. ✅ Intelligent search triggers compilation creation  
4. ✅ Recent search suggestions save
5. ✅ Saved compilations gallery works
6. ✅ Video playback with controls
7. ✅ Share/Save moment functionalities

---

## 🎯 **Next Steps:**
1. **Start with Videographer Account** → Create test project
2. **Save the project sharing link received** 
3. **Open incognito window**
4. **Use Couple Account** for accessing shared project
5. **Test all enhanced features** with real workflows

---

## 🚨 **Important Notes:**
- Use real/non-existing emails (can ease testing of email errors)
- AWS Amplify auth will generate magic link authentication  
- Project data persists so reload and logout works properly
- Feel free to use these test role-appropriate credentials for your workflow

**Ready for immediate testing!** 🎬

