<div onSubmit={handleLogin}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1e293b',
              marginBottom: '8px',
              letterSpacing: '0.025em'
            }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter the email used for your Sol course enrollment"
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                outline: 'none',
                fontSize: '16px',
                fontWeight: '400',
                color: '#2d3748',
                background: '#fefefe',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                opacity: isLoading ? 0.6 : 1
              }}
              required
              disabled={isLoading}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 2px 8px rgba(71, 85, 105, 0.15)'
                e.target.style.borderColor = 'rgba(71, 85, 105, 0.3)'
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleLogin(e)
                }
              }}
            />
            <p style={{
              marginTop: '8px',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '300',
              lineHeight: '1.5'
            }}>
              Use the same email address you used to enroll in the Sol course.
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <AlertCircle style={{ 
                width: '20px', 
                height: '20px', 
                color: '#ef4444', 
                flexShrink: 0, 
                marginTop: '2px' 
              }} />
              <div style={{ 
                color: '#dc2626', 
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: '1.5'
              }}>{error}</div>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading || !email}
            style={{
              width: '100%',
              backgroundColor: '#475569',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              letterSpacing: '0.025em',
              cursor: (!email || isLoading) ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 15px -3px rgba(71, 85, 105, 0.3)',
              transition: 'all 0.2s ease',
              opacity: (!email || isLoading) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
            onMouseOver={(e) => {
              if (!isLoading && email) {
                e.target.style.backgroundColor = '#334155'
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 20px 25px -5px rgba(71, 85, 105, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#475569'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 10px 15px -3px rgba(71, 85, 105, 0.3)'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                <span>Verifying course access...</span>
              </>
            ) : (
              <span>Access Sol™</span>
            )}
          </button>
        </div>