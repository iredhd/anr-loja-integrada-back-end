const axios = require('axios');
const admin = require('firebase-admin');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const qpdf = require('node-qpdf');
const nodemailer = require('nodemailer');

module.exports = {
  async send(request, response) {
    const { id } = request.body;

    if (!id) {
      return response.status(400).json({
        error: 'ID_NOT_FOUND',
        status: null,
      });
    }

    axios.defaults.baseURL = process.env.LOJAINTEGRADA_BASE_URL;

    axios.interceptors.request.use((config) => ({
      ...config,
      params: {
        ...config.params,
        format: 'json',
        chave_api: process.env.LOJAINTEGRADA_CHAVE_API,
        chave_aplicacao: process.env.LOJAINTEGRADA_CHAVE_APLICACAO,
      },
    }));

    let order = null;

    try {
      order = await axios.get(`pedido/${id}`);
      order = order.data;
    } catch (e) {
      return response.status(400).json({
        error: 'ORDER_NOT_FOUND',
        status: null,
      });
    }

    const password = (order.cliente.cpf || order.cliente.cnpj);

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), uuid()), { recursive: true });

    const toEncryptDir = path.join(directory, 'toEncrypt');
    fs.mkdirSync(toEncryptDir);

    const db = admin.firestore();
    const storage = admin.storage().bucket();

    const coursesToSend = (await Promise.all(order.itens.map(async (item) => {
      const courseData = await db.collection('courses').doc(item.sku).get();
      const course = courseData.data();

      if (!course) {
        return false;
      }

      return {
        sku: item.sku,
        ...course,
      };
    }))).filter((item) => item);

    const projectsToSend = (await Promise.all(order.itens.filter((item) => !coursesToSend.map((course) => course.sku).includes(item.sku)).map(async (item) => {
      const projectData = await db.collection('projects').doc(item.sku).get();
      const project = projectData.data();

      if (!project) {
        return false;
      }

      const regularFiles = await Promise.all(project.regularFiles.map(async (regularFile) => {
        const destination = path.join(directory, `${item.sku}_${path.basename(regularFile)}`);
        const file = storage.file(regularFile);

        await file.download({ destination });

        return destination;
      }));

      const encryptableFiles = await Promise.all(project.encryptableFiles.map(async (encryptableFile) => {
        const destination = path.join(toEncryptDir, `${item.sku}_${path.basename(encryptableFile)}`);
        const file = storage.file(encryptableFile);

        await file.download({ destination });

        const outputFile = path.join(directory, `${item.sku}_${path.basename(encryptableFile)}`);

        await new Promise((resolve) => {
          qpdf.encrypt(destination, {
            keyLength: 128,
            password,
            outputFile,
          }, resolve);
        });

        return outputFile;
      }));

      return [...regularFiles, ...encryptableFiles];
    }))).filter((item) => item);

    if (projectsToSend.length === 0 && coursesToSend.length === 0) {
      fs.rmdirSync(directory, { recursive: true });
      return response.status(400).json({
        error: 'NO_PRODUCTS_TO_SEND',
        status: null,
      });
    }

    const filesToSend = fs.readdirSync(directory);
    const attachments = filesToSend
      .filter((item) => fs.statSync(path.join(directory, item)).isFile())
      .map((file) => ({
        filename: path.basename(file),
        path: path.join(directory, file),
      }));

    try {
      await new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASSWORD,
          },
          tls: { rejectUnauthorized: false },
        });

        let html = `
          <p>Olá ${order.cliente.nome.trim()}! Tudo bem?</p>
        `;

        if (coursesToSend.length === 0) {
          html += `
            <p>Aqui estão os arquivos dos projetos que você comprou na nossa loja.</p>
            <br>
            <p>Os PDFs são salvos com uma senha única, que é seu CPF/CNPJ sem pontos ou traços, conforme abaixo:</p>
            <p><strong>${password}</strong></p>
            <br>
            <p>Para qualquer dúvida ou necessidade, entre em contato conosco através deste e-mail ou via WhatsApp no número +55 13 98219-9905</p>
            <br>`;
        } else if (projectsToSend.length === 0) {
          html += `
            <p>Aqui estão os links dos cursos que você comprou na nossa loja.</p>
            <p>Para se inscrever basta acessar cada um destes links através do Facebook e enviar a solicitação de entrada no grupo, e assim que possível nossa equipe irá aceitar o seu pedido.</p>`;

          coursesToSend.forEach((item) => {
            html += `<p><strong>${item.name}</strong>: ${item.link}</p>`;
          });

          html += '<br>';
        } else {
          html += `
            <p>Aqui estão os arquivos dos projetos que você comprou na nossa loja.</p>
            <br>
            <p>Os PDFs são salvos com uma senha única, que é seu CPF/CNPJ sem pontos ou traços, conforme abaixo:</p>
            <p><strong>${password}</strong></p>
            <br>
            <p>Aqui também estão os links dos cursos que você comprou na nossa loja.</p>
            <p>Para se inscrever basta acessar cada um destes links através do Facebook e enviar a solicitação de entrada no grupo, e assim que possível nossa equipe irá aceitar o seu pedido.</p>`;

          coursesToSend.forEach((item) => {
            html += `<p><strong>${item.name}</strong>: ${item.link}</p>`;
          });
        }

        html += `<br>
          <p>Para qualquer dúvida ou necessidade, entre em contato conosco através deste e-mail ou <a href="https://api.whatsapp.com/send?phone=5513982199905&text=Ol%C3%A1%2C%20sou%20${order.cliente.nome.trim()}%20e%20gostaria%20de%20falar%20sobre%20o%20pedido%20${id}.">via WhatsApp no número +55 13 98219-9905</a></p>
          <br>
          <p>Obrigado pela confiança!</p>
          <p>Equipe Artes no Reino</p>
          <br>
          <a href="https://loja.artesnoreino.com.br">Clique aqui para acessar a nossa lojinha</a>
        `;

        const mailOptions = {
          from: `"Artes no Reino" <${process.env.GMAIL_USER}>`,
          to: order.cliente.email,
          subject: `Pedido de venda #${id}`,
          html,
          attachments,
        };

        transporter.sendMail(mailOptions, (error) => {
          fs.rmdirSync(directory, { recursive: true });

          if (error) {
            return reject();
          }

          return resolve();
        });
      });
    } catch (e) {
      return response.status(400).json({
        error: 'EMAIL_FAIL',
        status: null,
      });
    }

    const codigo = order.itens.length !== [...projectsToSend, ...coursesToSend].length ? 'em_producao' : 'pedido_entregue';

    await axios.put(`situacao/pedido/${id}`, {
      codigo,
    });

    return response.status(200).json({
      error: null,
      status: codigo === 'pedido_entregue' ? 'SUCCESS' : 'PARTIAL_SUCCESS',
    });
  },
};
