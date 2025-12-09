const roomController = {
  dbPool: null,
  setDbPool: (pool) => { roomController.dbPool = pool; },

  getAllRooms: async (req, res) => {
    try {
      const result = await roomController.dbPool.query('SELECT * FROM rooms ORDER BY name ASC');
      const rooms = result.rows.map(room => ({
        ...room,
        features: room.features ? room.features.split(',') : [],
        image: room.image 
      }));
      res.status(200).json(rooms);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching rooms' });
    }
  },

  createRoom: async (req, res) => {
    const { name, capacity, features, location } = req.body;
    
    const image = req.file ? req.file.path : null;

    try {
      const query = `INSERT INTO rooms (name, capacity, location, features, image) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
      const result = await roomController.dbPool.query(query, [name, capacity, location, features, image]);
      res.status(201).json({ message: 'Created', room: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating room' });
    }
  },

  updateRoom: async (req, res) => {
    const { id } = req.params;
    const { name, capacity, location, features } = req.body;
    
    const image = req.file ? req.file.path : undefined;

    try {
      let query = 'UPDATE rooms SET name=$1, capacity=$2, location=$3, features=$4';
      let values = [name, capacity, location, features];
      let idx = 5;

      if (image) {
        query += `, image=$${idx}`;
        values.push(image);
        idx++;
      }
      query += ` WHERE id=$${idx} RETURNING *`;
      values.push(id);

      const result = await roomController.dbPool.query(query, values);
      if (result.rowCount === 0) return res.status(404).json({ message: 'Not found' });
      res.status(200).json({ message: 'Updated', room: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Update failed' });
    }
  },

  deleteRoom: async (req, res) => {
    const { id } = req.params;
    try {
        const check = await roomController.dbPool.query('SELECT image FROM rooms WHERE id=$1', [id]);
        if(check.rowCount === 0) return res.status(404).json({ message: 'Room not found'});
        
        await roomController.dbPool.query('DELETE FROM rooms WHERE id=$1', [id]);
        
        res.status(200).json({ message: 'Room deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
  }
};

module.exports = { roomController };