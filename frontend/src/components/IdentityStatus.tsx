import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Identity {
  walletAddress: string;
  isVerified: boolean;
  verificationTimestamp?: number;
  attributesVerified: number;
}

interface IdentityStatusProps {
  identity: Identity | null;
  loading: boolean;
  expanded?: boolean;
}

export function IdentityStatus({ identity, loading, expanded = false }: IdentityStatusProps) {
  const isAgeVerified = identity ? (identity.attributesVerified & 1) > 0 : false;
  const isNationalityVerified = identity ? (identity.attributesVerified & 2) > 0 : false;
  const isUniquenessVerified = identity ? (identity.attributesVerified & 4) > 0 : false;

  if (loading) {
    return (
      <div className="col-span-full bg-gray-800/50 rounded-xl p-6 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="col-span-full bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-gray-400" />
          <div>
            <h3 className="text-lg font-bold text-white">No Identity Registered</h3>
            <p className="text-sm text-gray-400">Scan your Aadhaar QR code to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Status Card */}
      <div className="col-span-full lg:col-span-1 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-700/50">
        <div className="flex items-center gap-3 mb-4">
          {identity.isVerified ? (
            <CheckCircle className="w-8 h-8 text-green-400" />
          ) : (
            <Clock className="w-8 h-8 text-yellow-400" />
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {identity.isVerified ? 'Verified Identity' : 'Pending Verification'}
            </h3>
            <p className="text-sm text-gray-300">
              {identity.isVerified ? 'Ready for authentication' : 'Complete attribute verification'}
            </p>
          </div>
        </div>
        
        {identity.verificationTimestamp && (
          <p className="text-xs text-gray-400">
            Verified: {new Date(identity.verificationTimestamp * 1000).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Attribute Cards */}
      <AttributeCard
        title="Age Verified"
        verified={isAgeVerified}
        description="Age range proof completed"
      />
      <AttributeCard
        title="Nationality Verified"
        verified={isNationalityVerified}
        description="Nationality verification completed"
      />
      <AttributeCard
        title="Uniqueness Verified"
        verified={isUniquenessVerified}
        description="Sybil resistance confirmed"
      />

      {/* Expanded Details */}
      {expanded && (
        <div className="col-span-full bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Identity Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Wallet Address" value={identity.walletAddress} mono />
            <DetailItem label="Verification Status" value={identity.isVerified ? 'Verified' : 'Pending'} />
            <DetailItem 
              label="Attributes Bitmap" 
              value={`0b${identity.attributesVerified.toString(2).padStart(8, '0')}`} 
              mono 
            />
            {identity.verificationTimestamp && (
              <DetailItem 
                label="Timestamp" 
                value={new Date(identity.verificationTimestamp * 1000).toLocaleString()} 
              />
            )}
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Verification Breakdown</h4>
            <div className="flex gap-4 text-sm">
              <VerificationBadge label="Age" verified={isAgeVerified} />
              <VerificationBadge label="Nationality" verified={isNationalityVerified} />
              <VerificationBadge label="Uniqueness" verified={isUniquenessVerified} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AttributeCard({ title, verified, description }: { title: string; verified: boolean; description: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        {verified ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <XCircle className="w-6 h-6 text-gray-500" />
        )}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm text-white ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}

function VerificationBadge({ label, verified }: { label: string; verified: boolean }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      verified ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-gray-900/50 text-gray-400 border border-gray-700'
    }`}>
      {label}: {verified ? '✓' : '✗'}
    </span>
  );
}
