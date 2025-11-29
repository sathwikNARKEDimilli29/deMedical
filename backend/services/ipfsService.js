const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  }
  
  async uploadFile(fileBuffer, fileName) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, fileName);
      
      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          uploadedBy: 'de-medical',
          timestamp: Date.now().toString()
        }
      });
      formData.append('pinataMetadata', metadata);
      
      const res = await axios.post(this.pinataUrl, formData, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        }
      });
      
      return {
        success: true,
        ipfsHash: res.data.IpfsHash,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`
      };
    } catch (error) {
      console.error('IPFS upload error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async uploadJSON(jsonData) {
    try {
      const res = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        jsonData,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );
      
      return {
        success: true,
        ipfsHash: res.data.IpfsHash,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`
      };
    } catch (error) {
      console.error('IPFS JSON upload error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  getUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}

module.exports = new IPFSService();
