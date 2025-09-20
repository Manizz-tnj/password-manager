class PasswordManager {
    constructor() {
        this.LOCAL_STORAGE_KEY = 'passwords';
        this.SETTINGS_KEY = 'settings';
        this.MAX_ATTEMPTS = 3;
        this.LOCK_DURATION_MS = 60000;
        this.incorrectAttempts = 0;
        this.lockTimeout = null;
        this.autoLockTimeout = null;
        this.currentPasswords = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkInitialSetup();
        this.loadSettings();
        this.checkLockStatus();
        this.startAutoLockTimer();
    }

    setupEventListeners() {
        document.getElementById('passwordForm').addEventListener('submit', (e) => this.handleSavePassword(e));
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => this.handleChangeMasterPassword(e));
        document.getElementById('setupForm').addEventListener('submit', (e) => this.handleSetupMasterPassword(e));
        
        // Auto-save settings when changed
        document.getElementById('autoLock').addEventListener('change', () => this.saveSettings());
        document.getElementById('theme').addEventListener('change', () => this.saveSettings());
    }

    checkInitialSetup() {
        const masterPassword = localStorage.getItem('masterPassword');
        if (!masterPassword) {
            this.navigateTo('setup');
        }
    }

    loadSettings() {
        const settings = this.getSettings();
        document.getElementById('autoLock').value = settings.autoLock;
        document.getElementById('theme').value = settings.theme;
        this.applyTheme(settings.theme);
    }

    getSettings() {
        const defaultSettings = {
            autoLock: 10,
            theme: 'light'
        };
        const saved = localStorage.getItem(this.SETTINGS_KEY);
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        const settings = {
            autoLock: parseInt(document.getElementById('autoLock').value),
            theme: document.getElementById('theme').value
        };
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        this.applyTheme(settings.theme);
        this.startAutoLockTimer();
    }

    applyTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
    }

    checkLockStatus() {
        const savedLockTimestamp = localStorage.getItem('lockTimestamp');
        if (savedLockTimestamp) {
            const timeElapsed = Date.now() - parseInt(savedLockTimestamp, 10);
            if (timeElapsed < this.LOCK_DURATION_MS) {
                this.lockAccount(this.LOCK_DURATION_MS - timeElapsed);
            } else {
                localStorage.removeItem('lockTimestamp');
            }
        }
    }

    startAutoLockTimer() {
        if (this.autoLockTimeout) {
            clearTimeout(this.autoLockTimeout);
        }
        
        const settings = this.getSettings();
        const lockTime = settings.autoLock * 60000; // Convert to milliseconds
        
        this.autoLockTimeout = setTimeout(() => {
            this.navigateTo('main');
            this.showNotification('Session expired. Please re-enter master password.', 'info');
        }, lockTime);
    }

    navigateTo(option) {
        // Hide all containers
        const containers = ['main', 'generate', 'save', 'changeMasterPassword', 'settings', 'lockNotice', 'setup'];
        containers.forEach(container => {
            const element = document.getElementById(container + 'Container');
            if (element) element.style.display = 'none';
        });
        
        // Show selected container
        const targetContainer = document.getElementById(option + 'Container');
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
        
        // Reset auto-lock timer
        this.startAutoLockTimer();
    }

    handleSetupMasterPassword(event) {
        event.preventDefault();
        const password = document.getElementById('setupMasterPassword').value;
        const confirmPassword = document.getElementById('confirmSetupPassword').value;
        
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match!', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('Master password must be at least 6 characters long!', 'error');
            return;
        }
        
        localStorage.setItem('masterPassword', password);
        this.showNotification('Master password created successfully!', 'success');
        this.navigateTo('main');
    }

    updateLengthDisplay() {
        const length = document.getElementById('passwordLength').value;
        document.getElementById('lengthDisplay').textContent = length;
    }

    handleGeneratePassword() {
        const length = parseInt(document.getElementById('passwordLength').value);
        const includeUppercase = document.getElementById('includeUppercase').checked;
        const includeLowercase = document.getElementById('includeLowercase').checked;
        const includeNumbers = document.getElementById('includeNumbers').checked;
        const includeSymbols = document.getElementById('includeSymbols').checked;
        const excludeSimilar = document.getElementById('excludeSimilar').checked;
        
        if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
            this.showNotification('Please select at least one character type!', 'error');
            return;
        }
        
        let charset = '';
        if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (includeNumbers) charset += '0123456789';
        if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        if (excludeSimilar) {
            charset = charset.replace(/[0O1lI]/g, '');
        }
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        document.getElementById('passwordDisplay').textContent = password;
        this.displayPasswordStrength(password);
    }

    displayPasswordStrength(password) {
        const strengthElement = document.getElementById('passwordStrength');
        const strength = this.calculatePasswordStrength(password);
        
        strengthElement.className = 'password-strength';
        
        if (strength < 30) {
            strengthElement.classList.add('strength-weak');
            strengthElement.textContent = '💔 Weak Password';
        } else if (strength < 60) {
            strengthElement.classList.add('strength-medium');
            strengthElement.textContent = '⚠️ Medium Password';
        } else if (strength < 80) {
            strengthElement.classList.add('strength-strong');
            strengthElement.textContent = '✅ Strong Password';
        } else {
            strengthElement.classList.add('strength-very-strong');
            strengthElement.textContent = '🔒 Very Strong Password';
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        // Length bonus
        score += Math.min(password.length * 4, 40);
        
        // Character variety bonus
        if (/[a-z]/.test(password)) score += 10;
        if (/[A-Z]/.test(password)) score += 10;
        if (/[0-9]/.test(password)) score += 10;
        if (/[^A-Za-z0-9]/.test(password)) score += 15;
        
        // Complexity bonus
        if (password.length >= 12) score += 10;
        if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(password)) score += 15;
        
        return Math.min(score, 100);
    }

    copyPassword() {
        const passwordDisplay = document.getElementById('passwordDisplay').textContent;
        if (passwordDisplay === 'Your password will appear here') {
            this.showNotification('No password to copy!', 'error');
            return;
        }
        
        navigator.clipboard.writeText(passwordDisplay).then(() => {
            this.showNotification('Password copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy password!', 'error');
        });
    }

    saveGeneratedPassword() {
        const password = document.getElementById('passwordDisplay').textContent;
        if (password === 'Your password will appear here') {
            this.showNotification('Generate a password first!', 'error');
            return;
        }
        
        document.getElementById('password').value = password;
        this.navigateTo('save');
        this.showNotification('Password moved to save form!', 'info');
    }

    handleSavePassword(event) {
        event.preventDefault();
        const website = document.getElementById('website').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const notes = document.getElementById('notes').value.trim();
        
        if (!website || !username || !password) {
            this.showNotification('Please fill in all required fields!', 'error');
            return;
        }
        
        const savedPasswords = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY)) || [];
        const newEntry = {
            id: Date.now(),
            website,
            username,
            password,
            notes,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        savedPasswords.push(newEntry);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(savedPasswords));
        this.showNotification('Password saved successfully!', 'success');
        document.getElementById('passwordForm').reset();
    }

    handleChangeMasterPassword(event) {
        event.preventDefault();
        const currentPassword = document.getElementById('currentMasterPassword').value;
        const newPassword = document.getElementById('newMasterPassword').value;
        const confirmPassword = document.getElementById('confirmMasterPassword').value;
        const storedPassword = localStorage.getItem('masterPassword');
        
        if (currentPassword !== storedPassword) {
            this.handleIncorrectPasswordAttempt();
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match!', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showNotification('New password must be at least 6 characters long!', 'error');
            return;
        }
        
        localStorage.setItem('masterPassword', newPassword);
        this.showNotification('Master password changed successfully!', 'success');
        document.getElementById('changePasswordForm').reset();
        this.navigateTo('main');
    }

    handleIncorrectPasswordAttempt() {
        this.incorrectAttempts++;
        if (this.incorrectAttempts >= this.MAX_ATTEMPTS) {
            this.lockAccount(this.LOCK_DURATION_MS);
            localStorage.setItem('lockTimestamp', Date.now().toString());
        } else {
            const remaining = this.MAX_ATTEMPTS - this.incorrectAttempts;
            this.showNotification(`Incorrect master password. ${remaining} attempts left.`, 'error');
        }
    }

    lockAccount(duration) {
        this.navigateTo('lockNotice');
        const countdownTimer = document.getElementById('countdownTimer');
        let timeRemaining = Math.ceil(duration / 1000);
        
        const updateCountdown = () => {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            countdownTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeRemaining <= 0) {
                clearInterval(this.lockTimeout);
                this.incorrectAttempts = 0;
                localStorage.removeItem('lockTimestamp');
                this.navigateTo('main');
                this.showNotification('Account unlocked. You may try again.', 'info');
            } else {
                timeRemaining--;
            }
        };
        
        updateCountdown();
        this.lockTimeout = setInterval(updateCountdown, 1000);
    }

    promptForMasterPassword() {
        const masterPassword = prompt('Enter master password to view saved passwords:');
        const storedPassword = localStorage.getItem('masterPassword');
        
        if (masterPassword === storedPassword) {
            this.listSavedPasswords();
        } else if (masterPassword !== null) { // null means user cancelled
            this.handleIncorrectPasswordAttempt();
        }
    }

    listSavedPasswords() {
        const savedPasswords = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY)) || [];
        this.currentPasswords = savedPasswords;
        this.displayPasswordTable(savedPasswords);
    }

    displayPasswordTable(passwords) {
        const passwordList = document.getElementById('passwordList');
        
        if (passwords.length === 0) {
            passwordList.innerHTML = '<p>No passwords saved</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Website</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Notes</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${passwords.map((entry, index) => `
                    <tr>
                        <td>${this.escapeHtml(entry.website)}</td>
                        <td>${this.escapeHtml(entry.username)}</td>
                        <td>
                            <input type="password" value="${this.escapeHtml(entry.password)}" readonly style="border: none; background: transparent; width: 100px;">
                        </td>
                        <td>${this.escapeHtml(entry.notes || '')}</td>
                        <td>${new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td class="table-actions">
                            <button onclick="passwordManager.copySavedPassword('${this.escapeHtml(entry.password)}')" class="copy-btn">📋</button>
                            <button onclick="passwordManager.togglePasswordVisibility(this)" class="toggle-btn">👁️</button>
                            <button onclick="passwordManager.editPassword(${entry.id})" class="save-btn">✏️</button>
                            <button onclick="passwordManager.deleteSavedPassword(${entry.id})" class="danger-btn">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        passwordList.innerHTML = '';
        passwordList.appendChild(table);
    }

    searchPasswords() {
        const query = document.getElementById('searchPasswords').value.toLowerCase();
        const filtered = this.currentPasswords.filter(entry => 
            entry.website.toLowerCase().includes(query) ||
            entry.username.toLowerCase().includes(query) ||
            (entry.notes && entry.notes.toLowerCase().includes(query))
        );
        this.displayPasswordTable(filtered);
    }

    togglePasswordVisibility(buttonElement) {
        const input = buttonElement.closest('tr').querySelector('input[type="password"], input[type="text"]');
        if (input.type === 'password') {
            input.type = 'text';
            buttonElement.textContent = '🙈';
        } else {
            input.type = 'password';
            buttonElement.textContent = '👁️';
        }
    }

    copySavedPassword(password) {
        navigator.clipboard.writeText(password).then(() => {
            this.showNotification('Password copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy password!', 'error');
        });
    }

    editPassword(id) {
        const passwords = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY)) || [];
        const password = passwords.find(p => p.id === id);
        
        if (!password) {
            this.showNotification('Password not found!', 'error');
            return;
        }
        
        // Fill the form with existing data
        document.getElementById('website').value = password.website;
        document.getElementById('username').value = password.username;
        document.getElementById('password').value = password.password;
        document.getElementById('notes').value = password.notes || '';
        
        // Delete the old entry
        this.deleteSavedPassword(id, false);
        
        // Navigate to save form
        this.navigateTo('save');
        this.showNotification('Password loaded for editing!', 'info');
    }

    deleteSavedPassword(id, showConfirm = true) {
        if (showConfirm && !confirm('Are you sure you want to delete this password?')) {
            return;
        }
        
        const passwords = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY)) || [];
        const updatedPasswords = passwords.filter(p => p.id !== id);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(updatedPasswords));
        
        this.currentPasswords = updatedPasswords;
        this.displayPasswordTable(updatedPasswords);
        
        if (showConfirm) {
            this.showNotification('Password deleted successfully!', 'success');
        }
    }

    exportPasswords() {
        const passwords = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY)) || [];
        const exportData = {
            passwords,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passwords_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Passwords exported successfully!', 'success');
    }

    importPasswords(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const passwords = data.passwords || data; // Support both wrapped and direct formats
                
                if (!Array.isArray(passwords)) {
                    throw new Error('Invalid file format');
                }
                
                const existingPasswords = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY)) || [];
                const importedCount = passwords.length;
                
                // Add unique IDs if missing
                passwords.forEach(p => {
                    if (!p.id) p.id = Date.now() + Math.random();
                    if (!p.createdAt) p.createdAt = new Date().toISOString();
                    if (!p.lastModified) p.lastModified = new Date().toISOString();
                });
                
                const mergedPasswords = [...existingPasswords, ...passwords];
                localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(mergedPasswords));
                
                this.showNotification(`Successfully imported ${importedCount} passwords!`, 'success');
                
                // Clear the file input
                event.target.value = '';
                
            } catch (error) {
                this.showNotification('Failed to import passwords. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (!confirm('⚠️ This will delete ALL your saved passwords and settings. This action cannot be undone. Are you sure?')) {
            return;
        }
        
        if (!confirm('Please confirm again: Delete ALL data permanently?')) {
            return;
        }
        
        localStorage.removeItem(this.LOCAL_STORAGE_KEY);
        localStorage.removeItem(this.SETTINGS_KEY);
        localStorage.removeItem('masterPassword');
        localStorage.removeItem('lockTimestamp');
        
        this.showNotification('All data cleared successfully!', 'success');
        
        // Redirect to setup
        setTimeout(() => {
            this.navigateTo('setup');
        }, 2000);
    }

    changeTheme() {
        this.saveSettings();
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for HTML onclick events
let passwordManager;

function navigateTo(option) {
    passwordManager.navigateTo(option);
}

function handleGeneratePassword() {
    passwordManager.handleGeneratePassword();
}

function updateLengthDisplay() {
    passwordManager.updateLengthDisplay();
}

function copyPassword() {
    passwordManager.copyPassword();
}

function saveGeneratedPassword() {
    passwordManager.saveGeneratedPassword();
}

function promptForMasterPassword() {
    passwordManager.promptForMasterPassword();
}

function searchPasswords() {
    passwordManager.searchPasswords();
}

function togglePasswordVisibility(input) {
    if (typeof input === 'string') {
        passwordManager.togglePasswordVisibility(input);
    } else {
        passwordManager.togglePasswordVisibility(input);
    }
}

function exportPasswords() {
    passwordManager.exportPasswords();
}

function importPasswords() {
    const fileInput = document.getElementById('importFile');
    passwordManager.importPasswords({ target: fileInput });
}

function clearAllData() {
    passwordManager.clearAllData();
}

function changeTheme() {
    passwordManager.changeTheme();
}

// Initialize the password manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    passwordManager = new PasswordManager();
});